import { storeService } from './store.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const storeController = {
  // Create product (Admin)
  createProduct: catchAsync(async (req, res) => {
    const product = await storeService.createProduct(req.body);
    res.status(201).json(new ApiResponse(201, 'Product created successfully', product));
  }),

  // Get all products
  getAllProducts: catchAsync(async (req, res) => {
    const { products, pagination } = await storeService.getAllProducts(req.query);
    res.json(new ApiResponse(200, 'Products retrieved', products, pagination));
  }),

  // Get featured products
  getFeaturedProducts: catchAsync(async (req, res) => {
    const products = await storeService.getFeaturedProducts(req.query.limit);
    res.json(new ApiResponse(200, 'Featured products retrieved', products));
  }),

  // Get product by ID
  getProductById: catchAsync(async (req, res) => {
    const product = await storeService.getProductById(req.params.id);
    res.json(new ApiResponse(200, 'Product retrieved', product));
  }),

  // Update product (Admin)
  updateProduct: catchAsync(async (req, res) => {
    const product = await storeService.updateProduct(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Product updated successfully', product));
  }),

  // Delete product (Admin)
  deleteProduct: catchAsync(async (req, res) => {
    await storeService.deleteProduct(req.params.id);
    res.json(new ApiResponse(200, 'Product deleted successfully'));
  }),

  // Place order
  placeOrder: catchAsync(async (req, res) => {
    const order = await storeService.placeOrder(req.user.userId, req.body);
    res.status(201).json(new ApiResponse(201, 'Order placed successfully', order));
  }),

  // Get my orders
  getMyOrders: catchAsync(async (req, res) => {
    const { orders, pagination } = await storeService.getMyOrders(req.user.userId, req.query);
    res.json(new ApiResponse(200, 'Orders retrieved', orders, pagination));
  }),

  // Get order by ID
  getOrderById: catchAsync(async (req, res) => {
    const order = await storeService.getOrderById(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Order retrieved', order));
  }),

  // Update order status (Admin)
  updateOrderStatus: catchAsync(async (req, res) => {
    const { status, trackingNumber } = req.body;
    const order = await storeService.updateOrderStatus(req.params.id, status, trackingNumber);
    res.json(new ApiResponse(200, 'Order status updated', order));
  }),

  // Cancel order
  cancelOrder: catchAsync(async (req, res) => {
    const order = await storeService.cancelOrder(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Order cancelled successfully', order));
  })
};

export default storeController;
