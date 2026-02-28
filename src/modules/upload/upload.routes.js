import express from 'express';
import uploadController from './upload.controller.js';
import { auth } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Upload endpoints
router.post('/image', upload.single('image'), uploadController.uploadImageHandler);
router.post('/video', upload.single('video'), uploadController.uploadVideoHandler);
router.post('/images', upload.array('images', 10), uploadController.uploadImagesHandler);
router.post('/base64', uploadController.uploadBase64Handler);
router.delete('/delete', uploadController.deleteFileHandler);
router.get('/signature', uploadController.getSignatureHandler);

export default router;
