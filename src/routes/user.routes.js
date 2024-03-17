import { Router } from "express";
import {
  login,
  logout,
  refreshAccessToken,
  register,
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { jwtVerify } from "../middlewares/loginjwt.middlewares.js";

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

export { userrouter };
