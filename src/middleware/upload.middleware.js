import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import ApiError from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Issue-15 fix: allow images, videos, and documents for story/profile uploads
  const allowedExtensions = /jpeg|jpg|png|gif|webp|pdf|doc|docx|mp4|mov|avi|webm|mkv/;
  const allowedMimetypes = /image\/(jpeg|jpg|png|gif|webp)|video\/(mp4|quicktime|x-msvideo|webm|x-matroska)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/;

  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Allowed: images (jpg/png/gif/webp), videos (mp4/mov/avi/webm) and documents (pdf/doc).'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // Issue-15 fix: increase to 100MB to support video files
  },
  fileFilter
});

export const uploadSingle = (fieldName) => upload.single(fieldName);
export const uploadMultiple = (fieldName, maxCount) => upload.array(fieldName, maxCount);
export const uploadFields = (fields) => upload.fields(fields);

export default upload;
