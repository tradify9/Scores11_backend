import { Product, Order } from './product.model.js';
import Wallet from '../wallet/wallet.model.js';
import Transaction from '../wallet/transaction.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

export const storeService = {
  // Create product (Admin)
  createProduct: async (productData) => {
    const product = await Product.create(productData);
    return product;
  },

  // Get all products
  getAllProducts: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const filter = { isActive: true };
    if (query.category) filter.category = query.category;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter)
    ]);

    return { products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  // Get featured products
  getFeaturedProducts: async (limit = 10) => {
    return Product.find({ isFeatured: true, isActive: true, stock: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit);
  },

  // Get product by ID
  getProductById: async (productId) => {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new ApiError(404, 'Product not found');
    }
    return product;
  },

  // Update product
  updateProduct: async (productId, updateData) => {
    const product = await Product.findByIdAndUpdate(productId, updateData, { new: true });
    if (!product) throw new ApiError(404, 'Product not found');
    return product;
  },

  // Delete product
  deleteProduct: async (productId) => {
    const product = await Product.findByIdAndUpdate(productId, { isActive: false }, { new: true });
    if (!product) throw new ApiError(404, 'Product not found');
    return { message: 'Product deleted successfully' };
  },

  // Place order
  placeOrder: async (userId, orderData) => {
    const { items, paymentMethod, shippingAddress } = orderData;

    // Calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        throw new ApiError(404, `Product ${item.product} not found`);
      }
      if (product.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }
      totalAmount += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
      // Reduce stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Process payment
    if (paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet || wallet.balance < totalAmount) {
        throw new ApiError(400, 'Insufficient wallet balance');
      }
      wallet.balance -= totalAmount;
      await wallet.save();

      await Transaction.create({
        user: userId,
        type: 'DEBIT',
        amount: totalAmount,
        status: 'COMPLETED',
        reference: `STORE-${Date.now()}`,
        description: 'Purchase order'
      });
    }

    const order = await Order.create({
      user: userId,
      items: orderItems,
      totalAmount,
      paymentMethod,
      paymentStatus: 'completed',
      shippingAddress
    });

    return order;
  },

  // Get my orders
  getMyOrders: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const [orders, total] = await Promise.all([
      Order.find({ user: userId, isActive: true })
        .populate('items.product', 'name price images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ user: userId, isActive: true })
    ]);

    return { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  // Get order by ID
  getOrderById: async (orderId, userId) => {
    const order = await Order.findOne({ _id: orderId, user: userId, isActive: true })
      .populate('items.product', 'name price images');
    if (!order) throw new ApiError(404, 'Order not found');
    return order;
  },

  // Update order status (Admin)
  updateOrderStatus: async (orderId, status, trackingNumber) => {
    const updateData = { orderStatus: status };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    
    const order = await Order.findByIdAndUpdate(orderId, updateData, { new: true })
      .populate('items.product', 'name price');
    if (!order) throw new ApiError(404, 'Order not found');
    return order;
  },

  // Cancel order
  cancelOrder: async (orderId, userId) => {
    const order = await Order.findOne({ _id: orderId, user: userId, isActive: true });
    if (!order) throw new ApiError(404, 'Order not found');
    
    if (['shipped', 'delivered'].includes(order.orderStatus)) {
      throw new ApiError(400, 'Cannot cancel shipped or delivered orders');
    }

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    // Refund to wallet if paid
    if (order.paymentStatus === 'completed') {
      const wallet = await Wallet.findOne({ user: userId });
      if (wallet) {
        wallet.balance += order.totalAmount;
        await wallet.save();

        await Transaction.create({
          user: userId,
          type: 'CREDIT',
          amount: order.totalAmount,
          status: 'COMPLETED',
          reference: `REFUND-${order._id}`,
          description: 'Order cancellation refund'
        });
      }
    }

    order.orderStatus = 'cancelled';
    await order.save();

    return order;
  }
};

export default storeService;
