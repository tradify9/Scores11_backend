import express from 'express';
import { associationController } from './association.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', associationController.getAllAssociations);
router.get('/:id', associationController.getAssociationById);
router.post('/', authenticate, associationController.createAssociation);
router.put('/:id', authenticate, associationController.updateAssociation);
router.delete('/:id', authenticate, associationController.deleteAssociation);
router.post('/:id/members', authenticate, associationController.addMember);
router.post('/:id/clubs', authenticate, associationController.addClub);

export default router;
