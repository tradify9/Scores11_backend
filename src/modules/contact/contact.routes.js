import express from 'express';
import { contactController } from './contact.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Public - submit ticket
router.post('/', contactController.createTicket);

// Protected
router.get('/my', authenticate, contactController.getMyTickets);
router.get('/:id', authenticate, contactController.getTicketById);
router.post('/:id/reply', authenticate, contactController.replyToTicket);
router.post('/:id/close', authenticate, contactController.closeTicket);

// Admin
router.get('/', authenticate, authorize(ROLES.ADMIN), contactController.getAllTickets);
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN), contactController.updateTicketStatus);

export default router;
