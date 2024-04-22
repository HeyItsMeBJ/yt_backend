import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares";
import { publishVideo } from "../controllers/video.controller";
import { jwtVerify } from "../middlewares/verifyLoginJWT";

const videorouter = Router();

videorouter
  .route("/")
  .post(
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
  )
  .get()
  .patch()
  .delete();

export { videorouter };
