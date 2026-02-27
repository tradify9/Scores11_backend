import { uploadImage } from '../config/cloudinary.js';

export const uploadSingle = async (file, folder = 'crick11') => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }
    const result = await uploadImage(file.path, folder);
    return result;
  } catch (error) {
    console.error('Single file upload error:', error);
    throw error;
  }
};

export const uploadMultipleFiles = async (files, folder = 'crick11') => {
  try {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }
    const uploadPromises = files.map(file => uploadImage(file.path, folder));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Multiple files upload error:', error);
    throw error;
  }
};

export const deleteFile = async (publicId) => {
  try {
    const { deleteImage } = await import('../config/cloudinary.js');
    return await deleteImage(publicId);
  } catch (error) {
    console.error('File deletion error:', error);
    throw error;
  }
};

export default {
  uploadSingle,
  uploadMultipleFiles,
  deleteFile
};
