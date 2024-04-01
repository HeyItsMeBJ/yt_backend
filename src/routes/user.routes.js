import { Router } from "express";
import {
  getAllUsers,
  getCurrentUserdata,
  getUserChannelDetails,
  getWatchHistory,
  login,
  logout,
  refreshAccessToken,
  register,
  updateAccountData,
  updateAvatar,
  updateCoverImage,
  updatePassword,
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { jwtVerify } from "../middlewares/verifyLoginJWT.js";

const userrouter = Router();

userrouter.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  register
);

userrouter.post("/login", login);

//secure router with jwt middleware
userrouter.post("/logout", jwtVerify, logout);
userrouter.post("/refresh-token", refreshAccessToken);
userrouter.post("/update-password", jwtVerify, updatePassword);
userrouter.get("/get-current-user", jwtVerify, getCurrentUserdata);

userrouter.patch("/update-account", jwtVerify, updateAccountData);

userrouter.patch(
  "/update-avatar",
  jwtVerify,
  upload.single("avatar"),
  updateAvatar
);
userrouter.patch(
  "/update-coverimage",
  jwtVerify,
  upload.single("coverImage"),
  updateCoverImage
);

userrouter.get(
  "/get-user-channel-details/:username",
  jwtVerify,
  getUserChannelDetails
);
userrouter.get("/get-watch-history", jwtVerify, getWatchHistory);

// this for testing the pagination concept
userrouter.get("/get-all-users",getAllUsers)

export { userrouter };
