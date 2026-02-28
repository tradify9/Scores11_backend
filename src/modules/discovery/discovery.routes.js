import express from 'express';
import discoveryController from './discovery.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/items', discoveryController.getAllDiscoveryItems);
router.get('/items/:id', discoveryController.getDiscoveryItemById);
router.get('/nearby', discoveryController.getNearbyItems);
router.get('/popular', discoveryController.getPopularItems);
router.get('/featured', discoveryController.getFeaturedProItems);
router.get('/locations', discoveryController.getLocations);

// Protected routes
router.get('/my-items', authenticate, discoveryController.getMyDiscoveryItems);
router.post('/items', authenticate, discoveryController.createDiscoveryItem);
router.put('/items/:id', authenticate, discoveryController.updateDiscoveryItem);
router.delete('/items/:id', authenticate, discoveryController.deleteDiscoveryItem);
router.patch('/items/:id/toggle', authenticate, discoveryController.toggleStatus);
router.patch('/items/:id/upgrade', authenticate, discoveryController.upgradeToPro);

export default router;
