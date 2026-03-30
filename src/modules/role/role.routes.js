import express from 'express';
import { roleController } from './role.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { roleValidation } from './role.validation.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

router.get('/', authenticate, authorize(ROLES.ADMIN), roleController.getRoles);
router.post('/', 
  authenticate, 
  authorize(ROLES.ADMIN), 
  validate(roleValidation.createRole), 
  roleController.createRole
);
router.get('/:id', authenticate, authorize(ROLES.ADMIN), roleController.getRole);
router.put('/:id', 
  authenticate, 
  authorize(ROLES.ADMIN), 
  validate(roleValidation.updateRole), 
  roleController.updateRole
);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), roleController.deleteRole);

export default router;
