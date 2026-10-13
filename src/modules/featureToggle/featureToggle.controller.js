import featureService from './featureToggle.service.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiResponse from '../../utils/ApiResponse.js';

const createFeature = catchAsync(async (req, res) => {
  const feature = await featureService.createFeature({ ...req.body, createdBy: req.user._id });
  ApiResponse.success(res, 'Feature created', feature, 201);
});

const getAllFeatures = catchAsync(async (req, res) => {
  const { page, limit, category, isEnabled } = req.query;
  const result = await featureService.getAllFeatures({ page: parseInt(page) || 1, limit: parseInt(limit) || 20, category, isEnabled });
  ApiResponse.success(res, 'Retrieved successfully', result);
});

const getFeatureById = catchAsync(async (req, res) => {
  const feature = await featureService.getFeatureById(req.params.id);
  ApiResponse.success(res, 'Retrieved successfully', feature);
});

const updateFeature = catchAsync(async (req, res) => {
  const feature = await featureService.updateFeature(req.params.id, req.body);
  ApiResponse.success(res, 'Feature updated', feature);
});

const deleteFeature = catchAsync(async (req, res) => {
  await featureService.deleteFeature(req.params.id);
  ApiResponse.success(res, 'Feature deleted', null);
});

const toggleFeature = catchAsync(async (req, res) => {
  const feature = await featureService.toggleFeature(req.params.key);
  ApiResponse.success(res, `Feature ${feature.isEnabled ? 'enabled' : 'disabled'}`, feature);
});

export { createFeature, getAllFeatures, getFeatureById, updateFeature, deleteFeature, toggleFeature };
