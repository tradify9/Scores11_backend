import { walletService } from './wallet.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const walletController = {
  // Get wallet
  getWallet: catchAsync(async (req, res) => {
    const wallet = await walletService.getWallet(req.user.userId);
    res.json(new ApiResponse(200, 'Wallet retrieved', wallet));
  }),

  // Get wallet balance
  getBalance: catchAsync(async (req, res) => {
    const balance = await walletService.getWalletBalance(req.user.userId);
    res.json(new ApiResponse(200, 'Balance retrieved', balance));
  }),

  // Deposit
  deposit: catchAsync(async (req, res) => {
    const result = await walletService.deposit(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Deposit successful', result));
  }),

  // Withdraw
  withdraw: catchAsync(async (req, res) => {
    const result = await walletService.withdraw(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Withdrawal request submitted', result));
  }),

  // Enter contest
  enterContest: catchAsync(async (req, res) => {
    const { contestId, entryFee, useBonus } = req.body;
    const result = await walletService.enterContest(req.user.userId, contestId, entryFee, useBonus);
    res.json(new ApiResponse(200, 'Contest entry successful', result));
  }),

  // Credit prize (internal/admin)
  creditPrize: catchAsync(async (req, res) => {
    const { userId, contestId, prizeAmount, rank } = req.body;
    const result = await walletService.creditPrize(userId, contestId, prizeAmount, rank);
    res.json(new ApiResponse(200, 'Prize credited', result));
  }),

  // Transfer
  transfer: catchAsync(async (req, res) => {
    const { toUserId, amount, description } = req.body;
    const result = await walletService.transfer(req.user.userId, toUserId, amount, description);
    res.json(new ApiResponse(200, 'Transfer successful', result));
  }),

  // Get transactions
  getTransactions: catchAsync(async (req, res) => {
    const { transactions, pagination } = await walletService.getTransactions(req.user.userId, req.query);
    res.json(new ApiResponse(200, 'Transactions retrieved', transactions, pagination));
  }),

  // Get transaction by ID
  getTransactionById: catchAsync(async (req, res) => {
    const transaction = await walletService.getTransactionById(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Transaction retrieved', transaction));
  }),

  // Get contest transactions
  getContestTransactions: catchAsync(async (req, res) => {
    const transactions = await walletService.getContestTransactions(req.user.userId, req.params.contestId);
    res.json(new ApiResponse(200, 'Contest transactions retrieved', transactions));
  }),

  // Get wallet statement
  getStatement: catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const statement = await walletService.getWalletStatement(req.user.userId, startDate, endDate);
    res.json(new ApiResponse(200, 'Statement retrieved', statement));
  }),

  // Get admin overview (public for dashboard)
  getAdminOverview: catchAsync(async (req, res) => {
    const overview = await walletService.getAdminOverview();
    res.json(new ApiResponse(200, 'Admin overview retrieved', overview));
  })
};

export default walletController;
