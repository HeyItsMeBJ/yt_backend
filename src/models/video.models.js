import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

 
const videoSchema = new Schema(
  {
    videoFile: {
      type: String, //video file url in cloudinary
      required: true,
    },
    thumbnail: {
      type: String, //thumbnail image of the video cloudinary url
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, //cloudinary give the duration of upload video
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema);
