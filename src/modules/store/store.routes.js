import express from 'express';
import { storeController } from './store.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Public routes
router.get('/products', storeController.getAllProducts);
router.get('/products/featured', storeController.getFeaturedProducts);
router.get('/products/:id', storeController.getProductById);

// For backwards compatibility
router.get('/', storeController.getAllProducts);
router.get('/featured', storeController.getFeaturedProducts);

// Protected routes - Orders
router.get('/cart', authenticate, storeController.getCart);
router.post('/cart/add', authenticate, storeController.addToCart);
router.put('/cart/item/:itemId', authenticate, storeController.updateCartItem);
router.delete('/cart/item/:itemId', authenticate, storeController.removeFromCart);
router.delete('/cart/clear', authenticate, storeController.clearCart);

router.post('/orders', authenticate, storeController.placeOrder);
router.get('/orders/my', authenticate, storeController.getMyOrders);
router.get('/orders/:id', authenticate, storeController.getOrderById);
router.post('/orders/:id/cancel', authenticate, storeController.cancelOrder);

// Admin routes - Products
router.post('/products', authenticate, authorize(ROLES.ADMIN), storeController.createProduct);
router.put('/products/:id', authenticate, authorize(ROLES.ADMIN), storeController.updateProduct);
router.delete('/products/:id', authenticate, authorize(ROLES.ADMIN), storeController.deleteProduct);

// Admin routes - Orders
router.patch('/orders/:id/status', authenticate, authorize(ROLES.ADMIN), storeController.updateOrderStatus);

// For backwards compatibility: keep generic product lookup after concrete routes.
router.get('/:id', storeController.getProductById);

export default router;
