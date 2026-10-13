import express from 'express';
import { walletController } from './wallet.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Get wallet info
router.get('/', authenticate, walletController.getWallet);
router.get('/balance', authenticate, walletController.getBalance);

// Transactions
router.get('/transactions', authenticate, walletController.getTransactions);
router.get('/transactions/:id', authenticate, walletController.getTransactionById);
router.get('/transactions/contest/:contestId', authenticate, walletController.getContestTransactions);

// Money operations
// No payment gateway verifies deposits yet, so a user-initiated deposit would
// mint free balance. Only admins may credit until a gateway is integrated.
router.post('/deposit', authenticate, (req, res, next) => {
  if ((req.user?.role || '').toString().toLowerCase() === ROLES.ADMIN) return next();
  return res.status(403).json({
    success: false,
    statusCode: 403,
    message: 'Online payments are not enabled yet. Please contact support to add money.'
  });
}, walletController.deposit);
router.post('/withdraw', authenticate, walletController.withdraw);
router.post('/transfer', authenticate, walletController.transfer);

// Contest operations
router.post('/contest/enter', authenticate, walletController.enterContest);
router.post('/contest/prize', authenticate, authorize(ROLES.ADMIN), walletController.creditPrize);

// Statement
router.get('/statement', authenticate, walletController.getStatement);

// Admin overview (financial totals) - admin panel sends its token
router.get('/admin/overview', authenticate, authorize(ROLES.ADMIN), walletController.getAdminOverview);

export default router;
