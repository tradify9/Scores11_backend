import { adminService } from './admin.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const adminController = {
  getDashboard: catchAsync(async (req, res) => {
    const dashboard = await adminService.getDashboard();
    res.json(new ApiResponse(200, 'Dashboard data retrieved', dashboard));
  }),

  getAllUsers: catchAsync(async (req, res) => {
    const { users, pagination } = await adminService.getAllUsers(req.query);
    res.json(new ApiResponse(200, 'Users retrieved', users, pagination));
  }),

  getUserById: catchAsync(async (req, res) => {
    const user = await adminService.getUserById(req.params.id);
    res.json(new ApiResponse(200, 'User retrieved', user));
  }),

  updateUser: catchAsync(async (req, res) => {
    const user = await adminService.updateUser(req.params.id, req.body);
    res.json(new ApiResponse(200, 'User updated', user));
  }),

  deleteUser: catchAsync(async (req, res) => {
    await adminService.deleteUser(req.params.id);
    res.json(new ApiResponse(200, 'User deleted'));
  }),

  getAllTournaments: catchAsync(async (req, res) => {
    const { tournaments, pagination } = await adminService.getAllTournaments(req.query);
    res.json(new ApiResponse(200, 'Tournaments retrieved', tournaments, pagination));
  }),

  getAllMatches: catchAsync(async (req, res) => {
    const { matches, pagination } = await adminService.getAllMatches(req.query);
    res.json(new ApiResponse(200, 'Matches retrieved', matches, pagination));
  }),

  getSystemStats: catchAsync(async (req, res) => {
    const stats = await adminService.getSystemStats();
    res.json(new ApiResponse(200, 'System stats retrieved', stats));
  })
};

export default adminController;
