import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const jwtVerify = asyncHandler(async (req, res, next) => {
  try {
    // get the token

    const accessToken =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!accessToken) throw new ApiError( "Access token is not provided",400);
    // verify and decode the token
    const verifiedToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_PRIVATE
    );
    if (!verifiedToken) throw new ApiError( "Token is invalid",400);
    

    // get the user from db using token data
    const userdata = await User.findById(verifiedToken?._id).select(
      "-password -refreshToken"
    );

    if (!userdata) throw new ApiError( "User does not exist!",400);
    // console.log("hi4");
    req.user = userdata;
    // console.log(userdata);
    next();
  } catch (error) {
    throw new ApiError( error?.message || "invalid accesstoken",401);
  }
});

export { jwtVerify };
