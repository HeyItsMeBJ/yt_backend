import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import uploadCloudinaryFile from "../utils/cloudinary.js";
import { ApiRes } from "../utils/ApiRes.js";
import fs from "fs";

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
  console.log(req.body)
  if (!username && !email )
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
        refreshToken: undefined,
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

export { register, login, logout };
