import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_PRIVATE,
});

const uploadCloudinaryFile = async (localPath) => {
  try {
    if (!localPath) return null;

    // else path is present , we can proceed to upload the file.
    const response = await cloudinary.uploader.upload(localPath, {
      resource_type: 'auto',
    });
    // console.log("Cloudinary response: ", response);
    fs.unlinkSync(localPath); // delete local file if uploading success in Cloudinary
    return response;
  } catch (error) {
    fs.unlinkSync(localPath); // delete local file if uploading fails in Cloudinary
    throw error;
  }
};

export default uploadCloudinaryFile;
