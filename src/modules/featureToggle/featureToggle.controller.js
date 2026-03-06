import featureService from './featureToggle.service.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiResponse from '../../utils/ApiResponse.js';

const createFeature = catchAsync(async (req, res) => {
  const feature = await featureService.createFeature({ ...req.body, createdBy: req.user._id });
  ApiResponse.success(res, feature, 'Feature created', 201);
});

const getAllFeatures = catchAsync(async (req, res) => {
  const { page, limit, category, isEnabled } = req.query;
  const result = await featureService.getAllFeatures({ page: parseInt(page) || 1, limit: parseInt(limit) || 20, category, isEnabled });
  ApiResponse.success(res, result);
});

const getFeatureById = catchAsync(async (req, res) => {
  const feature = await featureService.getFeatureById(req.params.id);
  ApiResponse.success(res, feature);
});

const updateFeature = catchAsync(async (req, res) => {
  const feature = await featureService.updateFeature(req.params.id, req.body);
  ApiResponse.success(res, feature, 'Feature updated');
});

const deleteFeature = catchAsync(async (req, res) => {
  await featureService.deleteFeature(req.params.id);
  ApiResponse.success(res, null, 'Feature deleted');
});

const toggleFeature = catchAsync(async (req, res) => {
  const feature = await featureService.toggleFeature(req.params.key);
  ApiResponse.success(res, feature, `Feature ${feature.isEnabled ? 'enabled' : 'disabled'}`);
});

export { createFeature, getAllFeatures, getFeatureById, updateFeature, deleteFeature, toggleFeature };
