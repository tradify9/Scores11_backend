import FeatureToggle from './featureToggle.model.js';
import ApiError from '../../utils/ApiError.js';

class FeatureToggleService {
  async createFeature(data) {
    const feature = await FeatureToggle.create(data);
    return feature;
  }

  async getAllFeatures(options = {}) {
    const { page = 1, limit = 20, category, isEnabled } = options;
    const query = {};
    
    if (category) query.category = category;
    if (isEnabled !== undefined) query.isEnabled = isEnabled;

    const features = await FeatureToggle.find(query)
      .sort({ category: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await FeatureToggle.countDocuments(query);

    return {
      features,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async getFeatureById(id) {
    const feature = await FeatureToggle.findById(id);
    if (!feature) throw new ApiError(404, 'Feature not found');
    return feature;
  }

  async getFeatureByKey(key) {
    const feature = await FeatureToggle.findOne({ key });
    return feature;
  }

  async updateFeature(id, data) {
    const feature = await FeatureToggle.findByIdAndUpdate(id, data, { new: true });
    if (!feature) throw new ApiError(404, 'Feature not found');
    return feature;
  }

  async deleteFeature(id) {
    const feature = await FeatureToggle.findByIdAndDelete(id);
    if (!feature) throw new ApiError(404, 'Feature not found');
    return feature;
  }

  async toggleFeature(key) {
    const feature = await FeatureToggle.findOne({ key });
    if (!feature) throw new ApiError(404, 'Feature not found');
    
    feature.isEnabled = !feature.isEnabled;
    await feature.save();
    return feature;
  }

  async getEnabledFeatures() {
    return FeatureToggle.find({ isEnabled: true });
  }

  async getFeaturesByCategory(category) {
    return FeatureToggle.find({ category, isEnabled: true });
  }
}

export default new FeatureToggleService();
