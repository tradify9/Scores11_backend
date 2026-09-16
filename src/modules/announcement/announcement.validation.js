import { body, param, query } from 'express-validator';

const announcementValidation = {
  createAnnouncement: [
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 300 })
      .withMessage('Message must be less than 300 characters'),
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
      .withMessage('End date must be a valid date')
  ],

  updateAnnouncement: [
    param('id')
      .isMongoId()
      .withMessage('Invalid announcement ID'),
    body('message')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Message cannot be empty')
      .isLength({ max: 300 })
      .withMessage('Message must be less than 300 characters'),
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
      .withMessage('End date must be a valid date')
  ],

  announcementId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid announcement ID')
  ],

  getAnnouncements: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ]
};

export { announcementValidation };
