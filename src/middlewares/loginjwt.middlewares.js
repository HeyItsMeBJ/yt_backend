import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";

const jwtVerify = async (req, res, next) => {
  // get the token
  try {
    const accessToken =
      req.cookies?.accessToken ||
      req.headers("Authorization")?.replace("Bearer ", "");
    if (!accessToken) throw new ApiError(400, "Access token is not provided");

    // verify and decode the token
    const verifiedToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_PRIVATE
    );
    if (!verifiedToken) throw new ApiError(400, "Token is invalid");

    // get the user from db using token data
    const userdata = await User.findOne(verifiedToken?._id).select(
      "-password -refreshToken"
    );
    if (!userdata) throw new ApiError(400, "User does not exist!");

    req.user = userdata;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid accesstoken");
  }
};

export { jwtVerify };
