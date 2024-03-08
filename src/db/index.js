import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDb = async () => {
  try {
    const connection = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(`MongoDB connected:  ${connection.connection.host}`);
  } catch (error) {
    console.log("connect error: ", error);
    // throw error
    process.exit(1);
  }
};

export default connectDb;
