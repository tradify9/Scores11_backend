import Joi from 'joi';

const createRoleSchema = Joi.object({
  name: Joi.string()
    .trim()
    .required()
    .max(50)
    .messages({
      'string.empty': 'Role name is required',
      'string.max': 'Role name cannot exceed 50 characters'
    }),
  slug: Joi.string()
    .lowercase()
    .trim()
    .optional(),
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  permissions: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .messages({
      'array.base': 'Permissions must be an array of strings'
    }),
  isActive: Joi.boolean().default(true),
  isSystem: Joi.boolean().default(false)
});

const updateRoleSchema = Joi.object({
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  permissions: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .messages({
      'array.base': 'Permissions must be an array of strings'
    }),
  isActive: Joi.boolean()
});

export const roleValidation = {
  createRole: createRoleSchema,
  updateRole: updateRoleSchema
};

