import express from 'express';
import * as announcementController from './announcement.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import { announcementValidation } from './announcement.validation.js';

const router = express.Router();

// Public - home page ticker feed
router.get('/active', announcementController.getActiveAnnouncements);

// Protected routes - Admin only
router.post('/',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(announcementValidation.createAnnouncement),
  announcementController.createAnnouncement
);

router.get('/',
  authenticate,
  authorize('admin', 'super_admin'),
  announcementController.getAllAnnouncements
);

router.get('/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  announcementController.getAnnouncementById
);

router.put('/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(announcementValidation.updateAnnouncement),
  announcementController.updateAnnouncement
);

router.delete('/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  announcementController.deleteAnnouncement
);

router.patch('/:id/toggle',
  authenticate,
  authorize('admin', 'super_admin'),
  announcementController.toggleAnnouncementStatus
);

router.post('/reorder',
  authenticate,
  authorize('admin', 'super_admin'),
  announcementController.reorderAnnouncements
);

export default router;
