import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import uploadCloudinaryFile from "../utils/cloudinary.js";
import { ApiRes } from "../utils/ApiRes.js";
import fs from "fs";
import jwt from "jsonwebtoken";

const register = asyncHandler(async (req, res, next) => {
  // taking all input fields from frontend
  const { username, email, fullname, password, refreshToken } = req.body;
  console.log(req.body);
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
  if (!username && !email)
    throw new ApiError("error : All fields are required.", 400);

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
    throw new ApiError(400, "please provide all fields");

  // find the user and check password
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(500, "server error");
  const isMatched = await user.isPasswordCorrect(oldPassword);
  if (!isMatched) throw new ApiError(401, "Wrong Password");

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
    throw new ApiError(400, "Please provide at least one field to update");

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
  if (!avatar) throw new ApiError(400, "Input the avatar");

  // get local path
  const avatarpath = avatar[0].path;
  if (!avatarpath) throw new ApiError(400, "input the avatar");

  // upload on cloudinary
  const uploadAvatar = await uploadCloudinaryFile(avatarpath);
  if (!uploadAvatar) throw new ApiError(500, "server error: upload problem");

  // get user and update avatar url on db
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: uploadAvatar.url } },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) {
    fs.unlinkSync(avatarpath);
    throw new ApiError(500, "Server Error: User not get");
  }

  // res 
  return res.status(200).json(new ApiRes(200, "avatar updated", user));
});

const updateCoverImage = asyncHandler(async (req, res, next) => {
  // get coverImage
  const coverImage = req.file;
  if (!coverImage) throw new ApiError(400, "Input the coverImage");

  // get local path
  const coverImagepath = coverImage[0].path;
  if (!coverImagepath) throw new ApiError(400, "input the coverImage");

  // upload on cloudinary
  const uploadCoverImage = await uploadCloudinaryFile(coverImagepath);
  if (!uploadCoverImage) throw new ApiError(500, "server error: upload problem");

  // get user and update coverImage url on db
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: uploadAvatar.url } },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) {
    fs.unlinkSync(coverImagepath);
    throw new ApiError(500, "Server Error: User not get");
  }

  // res 
  return res.status(200).json(new ApiRes(200, "coverImage updated", user));
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
  updateCoverImage
};
