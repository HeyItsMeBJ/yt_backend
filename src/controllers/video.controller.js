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
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";

const getAllVideos = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, userId, query, shortBy, shortType } = req.query;

  page = Number(page);
  limit = Number(limit);
});

const publishVideo = asyncHandler(async (req, res) => {
  const { title, discription } = req.body;
  const { videoFile, thumbnail } = req.files;

  //get file local paths
  const videoFilePath = videoFile ? videoFile[0]?.path : "";
  const thumbnailPath = thumbnail ? thumbnail[0]?.path : "";

  if (!videoFilePath || !thumbnailPath) {
    if (videoFilePath) fs.unlink(videoFilePath);
    if (thumbnailPath) fs.unlink(thumbnailPath);
    throw new ApiError("File not found, upload again", 500);
  }

  // check title & discription
  if (!title?.trim() || !discription?.trim()) {
    if (videoFilePath) fs.unlink(videoFilePath);
    if (thumbnailPath) fs.unlink(thumbnailPath);
    throw new ApiError("Fill required fields", 401);
  }

  const userId = req.user?._id;
  if (!userId) throw new ApiError("user Id not found", 500);

  // upload video and thumbnail to cloudinary
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

  // make video document
  const video = await Video.create({
    videoFile: uploadedVideoFile.url,
    thumbnail: uploadedThumbnail.url,
    owner: new mongoose.Types.ObjectId(userId),
    title,
    discription,
    duration: uploadedVideoFile.duration,
  });
  if (!video) throw new ApiError("Video not created", 500);

  // return
  return res.status(201).json(new ApiRes(201, "Video created", video));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) throw new ApiError("Video id is required", 400);

  // aggreation pipeline to get video and add likes and views
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

  // return
  return res.status(200).json(new ApiRes(200, "Video found", video[0]));
});

const updateVideo = asyncHandler(async (req, res) => {
  //  update video details like title, description, thumbnail
  const { videoId } = req.params;
  const { title, description } = req.body;
  const thumbnailFile = req.file;

  if (!thumbnailFile) throw new ApiError("Thumbnail not Provided", 400);
  const thumbnailPath = thumbnailFile.path;

  // check if title and description is provided
  if (!title || !description) {
    fs.unlink(thumbnailPath);
    throw new ApiError("Title or description not provided", 400);
  }

  // check video
  const video = await Video.findById(videoId);
  if (!video) {
    fs.unlink(thumbnailPath);
    throw new ApiError("Video not found", 404);
  }

  // check auth of video
  if (video.owner.toString() != req.user?._id) {
    fs.unlink(thumbnailPath);
    throw new ApiError("User not authenticated to this video", 400);
  }

  // delete old thumbnail and add new one
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

  // update video
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

  //return
  return res
    .status(201)
    .json(new ApiRes(201, "video updated successfully", updateVideo));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) throw new ApiError("Video Id not found", 404);

  // check video
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError("Video not found", 404);

  // check auth
  if (video.owner.toString() != req.user?._id)
    throw new ApiError("User not authenticated for this video", 400);

  //delete likes of video
  const isLikesDeleted = await Like.deleteMany({ video: ObjectId(video?._id) });
  if (!isLikesDeleted?.ok) throw new ApiError("Video Not deleted(likes)", 500);

  // delete likes of video
  const isCommentsDeleted = await Comment.deleteMany({
    video: ObjectId(video?._id),
  });
  if (!isCommentsDeleted?.ok)
    throw new ApiError("Video Not deleted(comments)", 500);

  // delete video
  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deletedVideo) throw new ApiError("Video Not deleted(video)", 500);

  // delete video from cloudinary and thumbnail
  const cloudinaryVideoDeletion = await deleteCloudinaryFile(
    extractPublicId(deletedVideo.videoFile)
  );
  if (!cloudinaryVideoDeletion)
    throw new ApiError("Video Not deleted(cloudinary)", 500);

  const cloudinaryThumbnailDeletion = await deleteCloudinaryFile(
    extractPublicId(deletedVideo.thumbnail)
  );
  if (!cloudinaryThumbnailDeletion)
    throw new ApiError("Video Not deleted(cloudinary thumbnail)", 500);

  // return
  return res
    .status(202)
    .json(new ApiRes(202, "Video deleted success", deletedVideo));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) throw new ApiError("Video id not found", 400);

  // check video
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError("Video not found", 404);

  // check auth
  if (video.owner.toString() != req.user?._id.toString())
    throw new ApiError("User not authourised for this Video", 400);

  // toggling publish status
  video.isPublished = !video.isPublished;
  const updatedVideo = await video.save({ validateBeforeSave: false });
  if (!updatedVideo) throw new ApiError("Video not updated", 500);

  // return
  return res.status(202).json(new ApiRes(202, "Video publish Toggled success"));
});

export {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
