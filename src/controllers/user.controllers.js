import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {uploadCloudinaryFile} from "../utils/cloudinary.js";
import { ApiRes } from "../utils/ApiRes.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const register = asyncHandler(async (req, res, next) => {
  // taking all input fields from frontend
  const { username, email, fullname, password, refreshToken } = req.body;
  // console.log(req.body);
  // check all imp input fields
  if (!username || !email || !fullname || !password) {
    throw new ApiError("Some fields are empty .. ", 400);
  }
  //   console.log("flag2");

  // check for avator
  const { avatar, coverImage } = req.files;
  if (!avatar) {
    throw new ApiError("error : input the avatar", 400);
  }
  const avatarPath = avatar[0]?.path;
  const coverImagePath = coverImage ? coverImage[0]?.path : null;
  if (!avatarPath) {
    throw new ApiError("error : input the avatar", 400);
  }

  //   console.log("flag3");
  // check existing user or not
  const userExist = await User.findOne({
    $or: [{ email: email }, { username: username }],
  });
  if (userExist) {
    fs.unlinkSync(avatarPath);
    if (coverImagePath) fs.unlinkSync(coverImagePath);
    throw new ApiError("error : User already exists", 409);
  }

  //   console.log("flag4");

  // upload avatar and coverImage in cloudinary
  const avatarUploaded = await uploadCloudinaryFile(avatarPath);
  const coverImageUploaded = await uploadCloudinaryFile(coverImagePath);
  if (!avatarUploaded) throw new ApiError("error : Sorry Server crashed", 500);
  //   else console.log('cloudinary upload success:',avatarUploaded, "\n", coverImageUploaded);

  //   console.log("flag5");

  // create a enty in db
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullname,
    avatar: avatarUploaded.url,
    coverImage: coverImageUploaded?.url || "",
    password,
    refreshToken,
  });

  //remove the password and refreshtoken from json object
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //check user is created
  if (createdUser) console.log("created: ");
  else throw new ApiError("server error", 500);

  // return response
  return res.status(201).json(new ApiRes(201, "Created", createdUser));
});

const login = asyncHandler(async (req, res, next) => {
  //get user input frontend
  const { username, email, password } = req.body;
  if (!username && !email) throw new ApiError("All fields are required.", 400);

  //get user from db
  const userdata = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });
  // console.log(userdata);

  //check user exist or not
  if (!userdata) throw new ApiError("error : user not found", 400);

  //check password is correct or not
  const isPasswordCorrect = await userdata.isPasswordCorrect(password);
  if (!isPasswordCorrect) throw new ApiError("error : Invalid Password", 400);

  // gen access and refresh token
  const accessToken = await userdata.genAccessToken();
  const refreshToken = await userdata.genRefreshToken();

  // update refresh token in db
  //   userdata.refreshToken=refreshToken //another way
  //  const updatedUserdata= await userdata.save({validateBeforeSave:false})  //another way
  const updatedUserdata = await User.findByIdAndUpdate(
    userdata._id,
    { $set: { refreshToken: refreshToken } },
    { new: true }
  ).select("-password -refreshToken");
  // console.log(updatedUserdata);
  if (!updatedUserdata) throw new ApiError("error : server error", 500);

  // send cookies & data
  const cookieOpt = { httpOnly: true, secure: true };
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOpt)
    .cookie("refreshToken", refreshToken, cookieOpt)
    .json(
      new ApiRes(200, "LogedIn", {
        user: updatedUserdata,
        accessToken,
        refreshToken,
      })
    );
});

const logout = asyncHandler(async (req, res, next) => {
  // take user
  const userdata = req.user;
  if (!userdata) throw new ApiError(401, "You are not logged In");

  // delete refresh token from db
  const updatedUserdata = await User.findByIdAndUpdate(
    userdata._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    { new: true }
  );
  if (!updatedUserdata) throw new ApiError(500, "server Error");

  // clear cookie
  const cookieOpt = { httpOnly: true, secure: true };
  return res
    .status(200)
    .clearCookie("accessToken", cookieOpt)
    .clearCookie("refreshToken", cookieOpt)
    .json(new ApiRes(200, "LoggedOut", {}));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    // get refresh token from cookies or body
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw new ApiError(400, "No Token Provided");

    //verify refresh token
    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_PRIVATE);
    if (!decodedToken) throw new ApiError(400, "Invalid Token");

    //find user
    const userdata = await User.findById(decodedToken?._id);
    if (!userdata) throw new ApiError(404, "User Not Found");

    // check token is same in db or not
    if (userdata.refreshToken !== token)
      throw new ApiError(400, "Invalid Token");

    //gen new tokens
    const accessToken = await userdata.genAccessToken();
    const refreshToken = await userdata.genRefreshToken();
    userdata.refreshToken = refreshToken;
    await userdata.save({ validateBeforeSave: false });

    const updatedUserdata = await User.findOne({
      username: userdata.username,
    }).select("-password -refreshToken");
    if (!updatedUserdata) throw new ApiError(500, "Server Error");
    // console.log(updatedUserdata)
    // set new updated cookie
    const cookieOpt = { httpOnly: true, secure: true };
    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOpt)
      .cookie("refreshToken", refreshToken, cookieOpt)
      .json(new ApiRes(200, "new access genterated", updatedUserdata));
  } catch (error) {
    throw new ApiError(400, error?.message || "invalid tokens");
  }
});

const updatePassword = asyncHandler(async (req, res, next) => {
  // take old new pass
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    throw new ApiError("please provide all fields", 400);

  // find the user and check password
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError("server error", 500);
  const isMatched = await user.isPasswordCorrect(oldPassword);
  if (!isMatched) throw new ApiError("Wrong Password", 401);

  // update pass
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  //res
  return res.status(200).json(new ApiRes(200, "Password Updated", {}));
});

const getCurrentUserdata = asyncHandler(async (req, res, next) => {
  return res.status(200).json(new ApiRes(200, "fetched", req.user));
});

const updateAccountData = asyncHandler(async (req, res, next) => {
  //get input data
  const { fullname, email } = req.body;
  if (!fullname && !email)
    throw new ApiError("Please provide at least one field to update", 400);

  //update data in DB
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullname, email } },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) throw new ApiError(500, "Server Error");

  //res updated data
  return res.status(200).json(new ApiRes(200, "Updated", user));
});

const updateAvatar = asyncHandler(async (req, res, next) => {
  // get avatar
  const avatar = req.file;

  if (!avatar) throw new ApiError("Input the avatar", 400);

  // get local path
  const avatarpath = avatar.path;
  if (!avatarpath) throw new ApiError("input the avatar", 400);
  // console.log(avatarpath)
  // upload on cloudinary
  const uploadAvatar = await uploadCloudinaryFile(avatarpath);
  if (!uploadAvatar) throw new ApiError("server error: upload problem", 500);

  // get user and update avatar url on db
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: uploadAvatar.url } },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) {
    fs.unlinkSync(avatarpath);
    throw new ApiError("Server Error: User not get", 500);
  }

  // res
  return res.status(200).json(new ApiRes(200, "avatar updated", user));
});

const updateCoverImage = asyncHandler(async (req, res, next) => {
  // get coverImage
  const coverImage = req.file;
  if (!coverImage) throw new ApiError("Input the coverImage", 400);

  // get local path
  const coverImagepath = coverImage.path;
  if (!coverImagepath) throw new ApiError("input the coverImage", 400);

  // upload on cloudinary
  const uploadCoverImage = await uploadCloudinaryFile(coverImagepath);
  if (!uploadCoverImage)
    throw new ApiError("server error: upload problem", 500);

  // get user and update coverImage url on db
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: updateCoverImage.url } },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) {
    fs.unlinkSync(coverImagepath);
    throw new ApiError("Server Error: User not get", 500);
  }

  // res
  return res.status(200).json(new ApiRes(200, "coverImage updated", user));
});

const getUserChannelDetails = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  if (!username) throw new ApiError("Please provide username", 400);

  const channel = await User.aggregate([
    { $match: { username: username?.toLowerCase() } },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        subscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        isSubscribed: 1,
        subscribedToCount: 1,
        subscribersCount: 1,
        username: 1,
        email: 1,
        fullname: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  if (!channel?.length) throw new ApiError("Channel Not Found", 400);

  return res.status(200).json(new ApiRes(200, "Channel Fetched ", channel[0]));
});

const getWatchHistory = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (!user) throw new ApiError("Please Login First!", "401");
  const watchHistory = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                    _id: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
    {
      $project: {
        watchHistory: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiRes(200, "History fetched", watchHistory[0]));
});


// testing pagination
const getAllUsers = asyncHandler(async (req, res, next) => {
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);

  const users = await User.aggregate([
    {
      $project: {
        _id: 1,
        username: 1,
        email: 1,
        fullname: 1,
      },
    },
  ]);

  const options = {
    page: page || 1,
    limit: limit || 2,
  };
  const resultUsers = await User.aggregatePaginate(users, options);

  // console.log(resultUsers);

  return res.status(200).json(
    new ApiRes(200, "all users fetched", resultUsers)
  );
});

export {
  register,
  login,
  logout,
  refreshAccessToken,
  updatePassword,
  getCurrentUserdata,
  updateAccountData,
  updateAvatar,
  updateCoverImage,
  getUserChannelDetails,
  getWatchHistory,
  getAllUsers,
};
