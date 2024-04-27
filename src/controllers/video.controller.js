import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import fs from "fs";
import {
  deleteCloudinaryFile,
  uploadCloudinaryFile,
} from "../utils/cloudinary.js";
import { Video } from "../models/video.models.js";
import { ApiRes } from "../utils/ApiRes.js";
import mongoose from "mongoose";
import { extractPublicId } from "cloudinary-build-url";

const getAllVideos = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, userId, query, shortBy, shortType } = req.query;

  page = Number(page);
  limit = Number(limit);
});

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

const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id

  const { videoId } = req.params;
  if (!videoId) throw new ApiError("Video id is required", 400);

  const video = await Video.aggregate([
    {
      // find video
      $match: { _id: new mongoose.Types.ObjectId(videoId) },
    },
    {
      // add likes and views to the video
      // populate(add new) likes field
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
        pipeline: [
          // populate liedBy field
          {
            $lookup: {
              from: "users",
              localField: "liedBy",
              foreignField: "_id",
              as: "liedBy",
            },
          },
        ],
      },
    },
    {
      // add likescount and isLiked fields
      $addFields: {
        isLiked: {
          $cond: {
            $in: [new mongoose.Types.ObjectId(req.user?._id), "$likes.liedBy"],
            then: true,
            else: false,
          },
        },
        likes: {
          $size: "$likes",
        },
      },
    },
    {
      // populate owner field
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            // pupulate(add new) subscribers field to owner_user
            $lookup: {
              from: "Subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            // add subscribersCount and isSubscribed fields
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  $in: [
                    new mongoose.Types.ObjectId(req.user?._id),
                    "$subscribers.subscriber",
                  ],
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
              views: {
                $add: [1, "$views"],
              },
            },
          },
        ],
      },
    },
  ]);

  if (!video) throw new ApiError("Video not found", 404);
  return res.status(200).json(new ApiRes(200, "Video found", video[0]));
});

const updateVideo = asyncHandler(async (req, res) => {
  //  update video details like title, description, thumbnail

  const { videoId } = req.params;
  const { title, description } = req.body;
  const thumbnailFile = req.file;

  if (!thumbnailFile) throw new ApiError("Thumbnail not Provided", 400);
  const thumbnailPath = thumbnailFile.path;
  if (!title || !description) {
    fs.unlink(thumbnailPath);
    throw new ApiError("Title or description not provided", 400);
  }
  

  const video = await Video.findById(videoId);
  if (!video) {
    fs.unlink(thumbnailPath);
    throw new ApiError("Video not found", 404);
  }
  if(video.owner.toString()!=req.user?._id){
    fs.unlink(thumbnailPath)
    throw new ApiError("User not authenticated to this video", 400);
  }
  const oldThumbnailCloudinaryPublicId = extractPublicId(video.url);
  const deleteOldThumbnail = await deleteCloudinaryFile(
    oldThumbnailCloudinaryPublicId
  );
  if (!deleteOldThumbnail) {
    fs.unlink(thumbnailPath);
    throw new ApiError("Old video delete problem", 500);
  }
  const newThumbnail = await uploadCloudinaryFile(thumbnailPath);
  if (!newThumbnail) {
    throw new ApiError("Thumbnail upload problem", 500);
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        thumbnail: newThumbnail.url,
        description,
        title,
      },
    },
    { new: true }
  );
  if (!updatedVideo) {
    deleteCloudinaryFile(newThumbnail.public_id);
    throw new ApiError("Video update problem", 500);
  }

  return res
    .status(201)
    .json(new ApiRes(201, "video updated successfully", updateVideo));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
