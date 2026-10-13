import bannerService from './banner.service.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiResponse from '../../utils/ApiResponse.js';

// Create a new banner
const createBanner = catchAsync(async (req, res) => {
  const bannerData = {
    ...req.body,
    createdBy: req.user._id
  };
  
  const banner = await bannerService.createBanner(bannerData);
  
  ApiResponse.success(res, 'Banner created successfully', banner, 201);
});

// Get all banners (admin)
const getAllBanners = catchAsync(async (req, res) => {
  const { page, limit, position, isActive, search } = req.query;
  
  const result = await bannerService.getAllBanners({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    position,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    search
  });
  
  ApiResponse.success(res, 'Banners retrieved', result);
});

// Get active banners for a specific position (public API)
const getActiveBanners = catchAsync(async (req, res) => {
  const { position } = req.params;
  
  const banners = await bannerService.getActiveBannersByPosition(position);
  
  // Record impressions for all banners
  if (banners.length > 0) {
    await Promise.all(
      banners.map(banner => bannerService.recordImpression(banner._id))
    );
  }
  
  ApiResponse.success(res, 'Banners retrieved', banners);
});

// Get banner by ID
const getBannerById = catchAsync(async (req, res) => {
  const banner = await bannerService.getBannerById(req.params.id);
  
  ApiResponse.success(res, 'Banners retrieved', banner);
});

// Update banner
const updateBanner = catchAsync(async (req, res) => {
  const banner = await bannerService.updateBanner(req.params.id, req.body);
  
  ApiResponse.success(res, 'Banner updated successfully', banner);
});

// Delete banner
const deleteBanner = catchAsync(async (req, res) => {
  await bannerService.deleteBanner(req.params.id);
  
  ApiResponse.success(res, 'Banner deleted successfully', null);
});

// Toggle banner status
const toggleBannerStatus = catchAsync(async (req, res) => {
  const banner = await bannerService.toggleBannerStatus(req.params.id);
  
  ApiResponse.success(res, `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`, banner);
});

// Reorder banners
const reorderBanners = catchAsync(async (req, res) => {
  const { position, orderedIds } = req.body;
  
  const result = await bannerService.reorderBanners(position, orderedIds);
  
  ApiResponse.success(res, 'Banners reordered successfully', result);
});

// Record banner click
const recordBannerClick = catchAsync(async (req, res) => {
  const banner = await bannerService.recordClick(req.params.id);
  
  ApiResponse.success(res, 'Banners retrieved', banner);
});

// Get banner analytics
const getBannerAnalytics = catchAsync(async (req, res) => {
  const analytics = await bannerService.getBannerAnalytics(req.params.id);
  
  ApiResponse.success(res, 'Banners retrieved', analytics);
});

// Get all banners analytics
const getAllBannersAnalytics = catchAsync(async (req, res) => {
  const analytics = await bannerService.getAllBannersAnalytics();
  
  ApiResponse.success(res, 'Banners retrieved', analytics);
});

export {
  createBanner,
  getAllBanners,
  getActiveBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners,
  recordBannerClick,
  getBannerAnalytics,
  getAllBannersAnalytics
};
