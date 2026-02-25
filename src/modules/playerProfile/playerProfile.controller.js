import { playerProfileService } from './playerProfile.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const playerProfileController = {
  // Create player profile (Self Registration)
  createProfile: catchAsync(async (req, res) => {
    const profile = await playerProfileService.createProfile(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Player profile created successfully', profile));
  }),

  // Get my profile
  getMyProfile: catchAsync(async (req, res) => {
    const profile = await playerProfileService.getMyProfile(req.user.userId);
    res.json(new ApiResponse(200, 'Profile retrieved', profile));
  }),

  // Get profile by ID
  getProfileById: catchAsync(async (req, res) => {
    const profile = await playerProfileService.getProfileById(req.params.id);
    res.json(new ApiResponse(200, 'Profile retrieved', profile));
  }),

  // Update profile
  updateProfile: catchAsync(async (req, res) => {
    const profile = await playerProfileService.updateProfile(req.params.id, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Profile updated successfully', profile));
  }),

  // Upload stats manually
  uploadStats: catchAsync(async (req, res) => {
    const profile = await playerProfileService.uploadStats(req.params.id, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Stats uploaded successfully', profile));
  }),

  // Update performance
  updatePerformance: catchAsync(async (req, res) => {
    const profile = await playerProfileService.updatePerformance(req.params.id, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Performance updated successfully', profile));
  }),

  // Link with Player
  linkWithPlayer: catchAsync(async (req, res) => {
    const { playerId } = req.body;
    const profile = await playerProfileService.linkWithPlayer(req.params.id, playerId, req.user.userId);
    res.json(new ApiResponse(200, 'Linked with player successfully', profile));
  }),

  // Verify profile (Admin)
  verifyProfile: catchAsync(async (req, res) => {
    const profile = await playerProfileService.verifyProfile(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Profile verified successfully', profile));
  }),

  // Reject profile (Admin)
  rejectProfile: catchAsync(async (req, res) => {
    const { reason } = req.body;
    const profile = await playerProfileService.rejectProfile(req.params.id, reason);
    res.json(new ApiResponse(200, 'Profile rejected', profile));
  }),

  // Get all profiles (Admin)
  getAllProfiles: catchAsync(async (req, res) => {
    const { profiles, pagination } = await playerProfileService.getAllProfiles(req.query);
    res.json(new ApiResponse(200, 'Profiles retrieved', profiles, pagination));
  }),

  // Get verified profiles
  getVerifiedProfiles: catchAsync(async (req, res) => {
    const { profiles, pagination } = await playerProfileService.getVerifiedProfiles(req.query);
    res.json(new ApiResponse(200, 'Verified profiles retrieved', profiles, pagination));
  }),

  // Delete profile
  deleteProfile: catchAsync(async (req, res) => {
    await playerProfileService.deleteProfile(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Profile deleted successfully'));
  })
};

export default playerProfileController;
