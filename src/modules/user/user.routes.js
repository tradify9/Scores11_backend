import express from 'express';
import { userController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

router.get('/me', authenticate, userController.getProfile);
router.put('/me', authenticate, userController.updateProfile);
router.post('/avatar', authenticate, upload.single('avatar'), userController.uploadAvatar);

router.get('/', authenticate, authorize(ROLES.ADMIN), userController.getAllUsers);
router.get('/:id', authenticate, userController.getUserById);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), userController.updateUser);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), userController.deleteUser);

export default router;
