import express from 'express';
import { searchController } from './search.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';

const router = express.Router();

// Global search - requires authentication
router.get('/', authMiddleware, searchController.globalSearch);

export default router;
