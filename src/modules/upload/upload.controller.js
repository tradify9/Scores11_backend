import { uploadImage, uploadVideo, deleteFile, uploadBase64, generateSignature } from '../../utils/fileUploader.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

// All upload handlers
export const uploadImageHandler = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json(new ApiResponse(400, 'No image file provided'));
  }
  
  const result = await uploadImage(req.file.path, req.body.folder || 'crick11');
  res.json(new ApiResponse(200, 'Image uploaded successfully', result));
});

export const uploadVideoHandler = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json(new ApiResponse(400, 'No video file provided'));
  }
  
  const result = await uploadVideo(req.file.path, req.body.folder || 'cric11/videos');
  res.json(new ApiResponse(200, 'Video uploaded successfully', result));
});

export const uploadImagesHandler = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json(new ApiResponse(400, 'No image files provided'));
  }
  
  const uploadPromises = req.files.map(file => uploadImage(file.path, req.body.folder || 'crick11'));
  const results = await Promise.all(uploadPromises);
  res.json(new ApiResponse(200, 'Images uploaded successfully', results));
});

export const uploadBase64Handler = catchAsync(async (req, res) => {
  const { image, folder } = req.body;
  
  if (!image) {
    return res.status(400).json(new ApiResponse(400, 'No base64 image provided'));
  }
  
  const result = await uploadBase64(image, folder || 'crick11');
  res.json(new ApiResponse(200, 'Image uploaded successfully', result));
});

export const deleteFileHandler = catchAsync(async (req, res) => {
  const { publicId } = req.body;
  
  if (!publicId) {
    return res.status(400).json(new ApiResponse(400, 'No public ID provided'));
  }
  
  const result = await deleteFile(publicId);
  if (result) {
    res.json(new ApiResponse(200, 'File deleted successfully'));
  } else {
    res.status(400).json(new ApiResponse(400, 'Failed to delete file'));
  }
});

export const getSignatureHandler = catchAsync(async (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = generateSignature(timestamp, req.query.folder || 'crick11');
  res.json(new ApiResponse(200, 'Signature generated', signature));
});

export default {
  uploadImageHandler,
  uploadVideoHandler,
  uploadImagesHandler,
  uploadBase64Handler,
  deleteFileHandler,
  getSignatureHandler
};
