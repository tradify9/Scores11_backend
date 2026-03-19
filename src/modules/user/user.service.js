import User from './user.model.js';
import { uploadImage, deleteImage } from '../../config/cloudinary.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

export const userService = {
  getUserByEmail: async (email) => {
    const user = await User.findOne({ email });
    return user;
  },

  createUser: async (userData) => {
  const { name, email, password, phone } = userData;

  try {

    // Validation
    if (!name || !email || !password) {
      return {
        success: false,
        message: "Name, email and password are required"
      };
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return {
        success: false,
        message: "User already exists with this email"
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "user",
      isActive: true
    });

    // Convert mongoose document to object
    const userObj = user.toObject();

    // Remove password from response
    delete userObj.password;

    return {
      success: true,
      data: userObj
    };

  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to create user"
    };
  }


  // Convert object and remove password
  const userObj = user.toObject();
  delete userObj.password;

  return {
    success: true,
    data: userObj
  };
},

  getUserById: async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  },

  updateProfile: async (userId, updateData) => {
    const allowedUpdates = ['name', 'phone', 'dateOfBirth', 'address', 'bio'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  uploadAvatar: async (userId, file) => { 
    if (!file) {
      throw new ApiError(400, 'No file uploaded');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.avatar?.publicId) {
      await deleteImage(user.avatar.publicId);
    }

    const uploadResult = await uploadImage(file.path, 'crick11/avatars');
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        avatar: {
          publicId: uploadResult.publicId,
          url: uploadResult.url
        }
      },
      { new: true }
    );

    return updatedUser;
  },

  getAllUsers: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = {};
    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  updateUser: async (userId, updateData) => {
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  deleteUser: async (userId) => {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }
};

export default userService;
