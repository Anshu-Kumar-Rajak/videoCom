import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const uploadFileOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.v2.uploader.upload(localFilePath, {
      resource_type: 'auto',
    });
    return response;


  } catch (error) {
    fs.unlinkSync(localFilePath); // Delete the local file after uploading to Cloudinary
    console.error('Error uploading file to Cloudinary:', error);
    return null;
  }
};

export { uploadFileOnCloudinary };
