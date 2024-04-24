import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares";
import {
  deleteVideo,
  getVideoById,
  publishVideo,
  updateVideo,
} from "../controllers/video.controller";
import { jwtVerify } from "../middlewares/verifyLoginJWT";

const videorouter = Router();

videorouter.route("/").post(
  jwtVerify,
  upload.fields(
    [
      {
        name: videoFile,
        maxCount: 1,
      },
      {
        name: thumbnail,
        maxCount: 1,
      },
    ],
    publishVideo
  )
);

videorouter
  .route("/:videoId", jwtVerify)
  .delete(deleteVideo)
  .patch(upload.single("thumbnail"), updateVideo);

videorouter.route("/:videoId").get(getVideoById);
export { videorouter };
