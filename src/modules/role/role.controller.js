import roleService from './role.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const roleController = {
  // Get all roles
  getRoles: catchAsync(async (req, res) => {
    const roles = await roleService.getRoles(req.query);
    res.json(new ApiResponse(200, 'Roles retrieved successfully', roles));
  }),

  // Create new role
  createRole: catchAsync(async (req, res) => {
    const role = await roleService.createRole(req.body);
    res.status(201).json(new ApiResponse(201, 'Role created successfully', role));
  }),

  // Get single role
  getRole: catchAsync(async (req, res) => {
    const role = await roleService.getRoleById(req.params.id);
    res.json(new ApiResponse(200, 'Role retrieved successfully', role));
  }),

  // Update role
  updateRole: catchAsync(async (req, res) => {
    const role = await roleService.updateRole(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Role updated successfully', role));
  }),

  // Delete role
  deleteRole: catchAsync(async (req, res) => {
    await roleService.deleteRole(req.params.id);
    res.json(new ApiResponse(200, 'Role deleted successfully'));
  })
};

export default roleController;

