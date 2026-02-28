import { v2 as cloudinary } from 'cloudinary';
import config from '../config/env.js';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true
});

// Image upload with optimizations
export const uploadImage = async (filePath, folder = 'crick11', options = {}) => {
  try {
    const defaultOptions = {
      folder,
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    };

    const result = await cloudinary.uploader.upload(filePath, { ...defaultOptions, ...options });
    
    // Delete local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      duration: result.duration // For videos
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(error.message || 'Image upload failed');
  }
};

// Video upload with optimizations
export const uploadVideo = async (filePath, folder = 'crick11/videos', options = {}) => {
  try {
    const defaultOptions = {
      folder,
      resource_type: 'video',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'mp4' }
      ],
      chunk_size: 6000000 // 6MB chunks for large videos
    };

    const result = await cloudinary.uploader.upload(filePath, { ...defaultOptions, ...options });
    
    // Delete local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      duration: result.duration,
      bytes: result.bytes,
      thumbnail: cloudinary.url(result.public_id, {
        format: 'jpg',
        width: 300,
        height: 200,
        crop: 'fill'
      })
    };
  } catch (error) {
    console.error('Cloudinary video upload error:', error);
    throw new Error(error.message || 'Video upload failed');
  }
};

// Delete image/video
export const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

// Upload multiple images
export const uploadMultiple = async (files, folder = 'crick11') => {
  try {
    const uploadPromises = files.map(file => uploadImage(file.path, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Cloudinary multiple upload error:', error);
    throw new Error('Multiple image upload failed');
  }
};

// Upload base64 image
export const uploadBase64 = async (base64String, folder = 'crick11') => {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder,
      resource_type: 'auto'
    });

    return {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format
    };
  } catch (error) {
    console.error('Cloudinary base64 upload error:', error);
    throw new Error('Base64 image upload failed');
  }
};

// Generate signed upload URL (for direct browser uploads)
export const generateSignature = (timestamp, folder = 'crick11') => {
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      resource_type: 'auto'
    },
    config.cloudinary.apiSecret
  );
  
  return {
    signature,
    cloudName: config.cloudinary.cloudName,
    apiKey: config.cloudinary.apiKey,
    timestamp,
    folder
  };
};

export default cloudinary;
