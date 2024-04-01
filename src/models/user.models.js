import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import aggregatePaginate from 'mongoose-aggregate-paginate-v2'

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary url
      required: true,
    },
    coverImage: {
      type: String,
      default: "", // cloudinary url
    },
    watchHistory: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Video",
        },
      ],
    },
    password: {
      type: String,
      required: [true, "Please dont leave this empty!"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// making the pre middleware for encripting the user input password as user input password we save the password to the db then pre in excecute just before saving and perform tasks
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
 this.password= await bcrypt.hash(this.password, 10);
  next();
});


//making methods for check the password is correct input by user, this is done by adding the ispasswordcorrect property in the methods
userSchema.methods.isPasswordCorrect = async function (inputPass) {
  return await bcrypt.compare(inputPass, this.password);
};

// use this cryptography techs for generating the access and refresh token
userSchema.methods.genAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_PRIVATE,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.genRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_PRIVATE,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};


userSchema.plugin(aggregatePaginate)

export const User = mongoose.model("User", userSchema);
