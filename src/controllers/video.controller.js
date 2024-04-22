import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import fs from "fs";
import {
  deleteCloudinaryFile,
  uploadCloudinaryFile,
} from "../utils/cloudinary";
import { Video } from "../models/video.models";
import { ApiRes } from "../utils/ApiRes";
import mongoose from "mongoose";

// const getAllVideos = asyncHandler(async (req, res, next) => {
//   const { page = 1, limit = 10, userId, query, shortBy, shortType } = req.query;

//   page = Number(page);
//   limit = Number(limit);
// });

const publishVideo = asyncHandler(async (req, res) => {
  const { title, discription } = req.body;
  const { videoFile, thumbnail } = req.files;

  const videoFilePath = videoFile ? videoFile[0]?.path : "";
  const thumbnailPath = thumbnail ? thumbnail[0]?.path : "";

  if (!videoFilePath || !thumbnailPath) {
    if (videoFilePath) fs.unlink(videoFilePath);
    if (thumbnailPath) fs.unlink(thumbnailPath);
    throw new ApiError("File not found, upload again", 500);
  }

  if (!title?.trim() || !discription?.trim()) {
    if (videoFilePath) fs.unlink(videoFilePath);
    if (thumbnailPath) fs.unlink(thumbnailPath);
    throw new ApiError("Fill required fields", 401);
  }

  const userId = req.user?._id;
  if (!userId) throw new ApiError("Id not found", 500);

  const uploadedVideoFile = await uploadCloudinaryFile(videoFilePath);
  if (!uploadedVideoFile) {
    fs.unlink(thumbnailPath);
    throw new ApiError("upload failed", 500);
  }

  const uploadedThumbnail = await uploadCloudinaryFile(thumbnailPath);
  if (!uploadedThumbnail) {
    deleteCloudinaryFile(uploadedVideoFile.public_id, "video");
    throw new ApiError("upload failed", 500);
  }

  const video = await Video.create({
    videoFile: uploadedVideoFile.url,
    thumbnail: uploadedThumbnail.url,
    owner: new mongoose.Types.ObjectId(userId),
    title,
    discription,
    duration: uploadedVideoFile.duration,
  });

  if (!video) throw new ApiError("Video not created", 500);

  return res.status(201).json(new ApiRes(201, "Video created", video));
});



export { getAllVideos, publishVideo };
