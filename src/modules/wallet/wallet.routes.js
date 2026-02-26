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
router.post('/deposit', authenticate, walletController.deposit);
router.post('/withdraw', authenticate, walletController.withdraw);
router.post('/transfer', authenticate, walletController.transfer);

// Contest operations
router.post('/contest/enter', authenticate, walletController.enterContest);
router.post('/contest/prize', authenticate, authorize(ROLES.ADMIN), walletController.creditPrize);

// Statement
router.get('/statement', authenticate, walletController.getStatement);

// Admin overview (public for dashboard)
router.get('/admin/overview', walletController.getAdminOverview);

export default router;
