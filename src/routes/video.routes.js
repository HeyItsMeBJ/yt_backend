import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishVideo,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controller.js";
import { jwtVerify } from "../middlewares/verifyLoginJWT.js";

const videorouter = Router();

videorouter.route("/").get(getAllVideos);

videorouter.route("/").post(
  jwtVerify,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishVideo
);

videorouter
  .route("/:videoId")
  .delete(jwtVerify, deleteVideo)
  .patch(jwtVerify, upload.single("thumbnail"), updateVideo);

videorouter.route("/:videoId").get(getVideoById);
videorouter
  .route("/toggle-publish/:videoId")
  .patch(jwtVerify, togglePublishStatus);
export { videorouter };
