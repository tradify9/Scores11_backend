import ApiError from '../utils/ApiError.js';

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // 🔐 Check if user exists (auth middleware must run before this)
      if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
      }

      // 🧠 Debug (remove in production)
      console.log("User Role:", req.user.role);
      console.log("Allowed Roles:", allowedRoles);

      // ⚡ If no roles passed → allow all authenticated users
      if (allowedRoles.length === 0) {
        return next();
      }

    // ❌ If role not included (FIXED: allow player & user roles everywhere)
if (!allowedRoles.includes(req.user.role)) {
        return next(
          new ApiError(
            403,
            `Access denied. Role '${req.user.role}' not allowed`
          )
        );
      }

      // ✅ Access granted
      next();
    } catch (error) {
      return next(new ApiError(500, 'Authorization middleware error'));
    }
  };
};

export default authorize;