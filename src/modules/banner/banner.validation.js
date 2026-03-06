import { body, param, query } from 'express-validator';

const bannerValidation = {
  createBanner: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 100 })
      .withMessage('Title must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('image')
      .trim()
      .notEmpty()
      .withMessage('Image URL is required'),
    body('videoUrl')
      .optional()
      .trim()
      .isURL()
      .withMessage('Video URL must be a valid URL'),
    body('gifUrl')
      .optional()
      .trim()
      .isURL()
      .withMessage('GIF URL must be a valid URL'),
    body('link')
      .optional()
      .trim()
      .isURL()
      .withMessage('Link must be a valid URL'),
    body('linkType')
      .optional()
      .isIn(['external', 'internal', 'none'])
      .withMessage('Link type must be external, internal, or none'),
    body('position')
      .optional()
      .isIn(['home', 'tournament', 'match', 'team', 'player', 'news', 'blog', 'store', 'general'])
      .withMessage('Invalid position'),
    body('order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Order must be a positive integer'),
    body('size.width')
      .optional()
      .isInt({ min: 100, max: 3840 })
      .withMessage('Width must be between 100 and 3840'),
    body('size.height')
      .optional()
      .isInt({ min: 100, max: 2160 })
      .withMessage('Height must be between 100 and 2160'),
    body('size.aspectRatio')
      .optional()
      .isIn(['16:9', '4:3', '1:1', '9:16'])
      .withMessage('Invalid aspect ratio'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date'),
    body('targetAudience')
      .optional()
      .isIn(['all', 'players', 'teams', 'admins', 'guests'])
      .withMessage('Invalid target audience')
  ],

  updateBanner: [
    param('id')
      .isMongoId()
      .withMessage('Invalid banner ID'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Title must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('image')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Image URL cannot be empty'),
    body('videoUrl')
      .optional()
      .trim()
      .isURL()
      .withMessage('Video URL must be a valid URL'),
    body('gifUrl')
      .optional()
      .trim()
      .isURL()
      .withMessage('GIF URL must be a valid URL'),
    body('link')
      .optional()
      .trim()
      .isURL()
      .withMessage('Link must be a valid URL'),
    body('linkType')
      .optional()
      .isIn(['external', 'internal', 'none'])
      .withMessage('Link type must be external, internal, or none'),
    body('position')
      .optional()
      .isIn(['home', 'tournament', 'match', 'team', 'player', 'news', 'blog', 'store', 'general'])
      .withMessage('Invalid position'),
    body('order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Order must be a positive integer'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date'),
    body('targetAudience')
      .optional()
      .isIn(['all', 'players', 'teams', 'admins', 'guests'])
      .withMessage('Invalid target audience')
  ],

  bannerId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid banner ID')
  ],

  getBanners: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('position')
      .optional()
      .isIn(['home', 'tournament', 'match', 'team', 'player', 'news', 'blog', 'store', 'general'])
      .withMessage('Invalid position'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search must be less than 100 characters')
  ]
};

export { bannerValidation };
