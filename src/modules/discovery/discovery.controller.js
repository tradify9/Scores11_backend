import discoveryService from './discovery.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';
import { authenticate } from '../../middleware/auth.middleware.js';

/**
 * Get all discovery items with filters
 */
export const getAllDiscoveryItems = catchAsync(async (req, res) => {
  const { type, location, search, isPro, latitude, longitude, radius, page, limit, sortBy, sortOrder } = req.query;

  const result = await discoveryService.getAllDiscoveryItems(
    { type, location, search, isPro, latitude, longitude, radius },
    { page: parseInt(page) || 1, limit: parseInt(limit) || 20, sortBy, sortOrder }
  );

  res.json(new ApiResponse(200, 'Discovery items fetched successfully', result));
});

/**
 * Get discovery item by ID
 */
export const getDiscoveryItemById = catchAsync(async (req, res) => {
  const item = await discoveryService.getDiscoveryItemById(req.params.id);
  res.json(new ApiResponse(200, 'Discovery item fetched successfully', item));
});

/**
 * Create discovery item
 */
export const createDiscoveryItem = catchAsync(async (req, res) => {
  const item = await discoveryService.createDiscoveryItem({
    ...req.body,
    userId: req.user?.id,
  });
  res.status(201).json(new ApiResponse(201, 'Discovery item created successfully', item));
});

/**
 * Update discovery item
 */
export const updateDiscoveryItem = catchAsync(async (req, res) => {
  const item = await discoveryService.updateDiscoveryItem(req.params.id, req.body);
  res.json(new ApiResponse(200, 'Discovery item updated successfully', item));
});

/**
 * Delete discovery item
 */
export const deleteDiscoveryItem = catchAsync(async (req, res) => {
  await discoveryService.deleteDiscoveryItem(req.params.id);
  res.json(new ApiResponse(200, 'Discovery item deleted successfully', null));
});

/**
 * Get my discovery items
 */
export const getMyDiscoveryItems = catchAsync(async (req, res) => {
  const items = await discoveryService.getItemsByUserId(req.user.id);
  res.json(new ApiResponse(200, 'My discovery items fetched successfully', items));
});

/**
 * Get nearby discovery items
 */
export const getNearbyItems = catchAsync(async (req, res) => {
  const { latitude, longitude, radius, type } = req.query;
  const items = await discoveryService.getNearbyItems(
    parseFloat(latitude),
    parseFloat(longitude),
    parseInt(radius) || 10,
    type
  );
  res.json(new ApiResponse(200, 'Nearby items fetched successfully', items));
});

/**
 * Get popular discovery items
 */
export const getPopularItems = catchAsync(async (req, res) => {
  const { limit, type } = req.query;
  const items = await discoveryService.getPopularItems(parseInt(limit) || 10, type);
  res.json(new ApiResponse(200, 'Popular items fetched successfully', items));
});

/**
 * Get featured PRO items
 */
export const getFeaturedProItems = catchAsync(async (req, res) => {
  const { limit } = req.query;
  const items = await discoveryService.getFeaturedProItems(parseInt(limit) || 10);
  res.json(new ApiResponse(200, 'Featured PRO items fetched successfully', items));
});

/**
 * Get unique locations
 */
export const getLocations = catchAsync(async (req, res) => {
  const locations = await discoveryService.getUniqueLocations();
  res.json(new ApiResponse(200, 'Locations fetched successfully', locations));
});

/**
 * Toggle discovery item status
 */
export const toggleStatus = catchAsync(async (req, res) => {
  const item = await discoveryService.toggleStatus(req.params.id);
  res.json(new ApiResponse(200, 'Status toggled successfully', item));
});

/**
 * Upgrade to PRO
 */
export const upgradeToPro = catchAsync(async (req, res) => {
  const item = await discoveryService.upgradeToPro(req.params.id);
  res.json(new ApiResponse(200, 'Upgraded to PRO successfully', item));
});

export default {
  getAllDiscoveryItems,
  getDiscoveryItemById,
  createDiscoveryItem,
  updateDiscoveryItem,
  deleteDiscoveryItem,
  getMyDiscoveryItems,
  getNearbyItems,
  getPopularItems,
  getFeaturedProItems,
  getLocations,
  toggleStatus,
  upgradeToPro,
};
