import { userService } from './user.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

export const userController = {
  register: catchAsync(async (req, res) => {
    const { name, email, password, phone } = req.body;
    
    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      throw new ApiError(400, 'Email already registered');
    }
    
    // Create user
    const user = await userService.createUser({ name, email, password, phone });
    
    res.status(201).json(new ApiResponse(201, 'User registered successfully', user));
  }),

  getProfile: catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.user.userId);
    res.json(new ApiResponse(200, 'User profile retrieved', user));
  }),

  updateProfile: catchAsync(async (req, res) => {
    const user = await userService.updateProfile(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Profile updated successfully', user));
  }),

  uploadAvatar: catchAsync(async (req, res) => {
    const user = await userService.uploadAvatar(req.user.userId, req.file);
    res.json(new ApiResponse(200, 'Avatar uploaded successfully', user));
  }),

  getAllUsers: catchAsync(async (req, res) => {
    const { users, pagination } = await userService.getAllUsers(req.query);
    res.json(new ApiResponse(200, 'Users retrieved', users, pagination));
  }),

  getUserById: catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    res.json(new ApiResponse(200, 'User retrieved', user));
  }),

  updateUser: catchAsync(async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(new ApiResponse(200, 'User updated successfully', user));
  }),

  deleteUser: catchAsync(async (req, res) => {
    await userService.deleteUser(req.params.id);
    res.json(new ApiResponse(200, 'User deleted successfully'));
  })
};

export default userController;
