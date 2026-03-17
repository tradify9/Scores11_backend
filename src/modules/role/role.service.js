import Role from './role.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { paginate } from '../../utils/pagination.js';

const roleService = {
  // Create role
  createRole: async (roleData) => {
    // Check for duplicate slug
    const existingSlug = await Role.findOne({ 
      slug: roleData.slug?.toLowerCase() 
    });
    if (existingSlug) {
      throw new ApiError(400, 'Role slug already exists');
    }

    const role = await Role.create(roleData);
    return role.populate('userCount');
  },

  // Get all roles
  getRoles: async (filter = {}) => {
    const roles = await Role.find(filter)
      .populate('userCount')
      .sort({ createdAt: -1 });
    return roles;
  },

  // Get role by ID
  getRoleById: async (id) => {
    const role = await Role.findById(id).populate('userCount');
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }
    return role;
  },

  // Update role
  updateRole: async (id, updateData) => {
    const role = await Role.findById(id);
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    if (role.isSystem) {
      throw new ApiError(400, 'Cannot modify system role');
    }

    // Prevent changing name/slug of system roles
    const allowedUpdates = ['description', 'permissions', 'isActive'];
    const updates = {};
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedUpdates.includes(key)) {
        updates[key] = value;
      }
    }

    const updatedRole = await Role.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    ).populate('userCount');

    if (!updatedRole) {
      throw new ApiError(404, 'Role not found');
    }

    return updatedRole;
  },

  // Delete role
  deleteRole: async (id) => {
    const role = await Role.findById(id);
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    if (role.isSystem) {
      throw new ApiError(400, 'Cannot delete system role');
    }

    // Check if role has users
    const userCount = await User.countDocuments({ role: id });
    if (userCount > 0) {
      throw new ApiError(400, `Cannot delete role with ${userCount} active users`);
    }

    await Role.findByIdAndDelete(id);
  },

  // Get role with pagination
  getRolesPaginated: async (options) => {
    const { page = 1, limit = 10, name, isActive, search } = options;
    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const roles = await Role.find(filter)
      .populate('userCount')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Role.countDocuments(filter);

    return {
      roles,
      pagination: paginate(total, page, limit)
    };
  },

  // Get permissions for role
  getRolePermissions: async (roleId) => {
    const role = await Role.findById(roleId).select('permissions');
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }
    return role.permissions || [];
  },

  // Check if role exists by slug
  roleExists: async (slug) => {
    return await Role.findOne({ slug: slug.toLowerCase() });
  }
};

export default roleService;

