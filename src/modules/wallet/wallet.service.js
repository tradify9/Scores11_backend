import Wallet from './wallet.model.js';
import Transaction from './transaction.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import config from '../../config/env.js';

export const walletService = {
  // Get or create wallet
  getWallet: async (userId) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ 
        user: userId, 
        balance: 0, 
        currency: 'INR',
        bonusBalance: 0,
        winningBalance: 0
      });
    }
    return wallet;
  },

  // Get wallet balance breakdown
  getWalletBalance: async (userId) => {
    const wallet = await walletService.getWallet(userId);
    return {
      totalBalance: wallet.balance,
      bonusBalance: wallet.bonusBalance,
      winningBalance: wallet.winningBalance,
      currency: wallet.currency,
      isActive: wallet.isActive
    };
  },

  // Deposit money
  deposit: async (userId, depositData) => {
    const { amount, paymentMethod, transactionId, bonusCode } = depositData;

    // Validate amount
    const minDeposit = config.wallet?.minDeposit || 100;
    const maxDeposit = config.wallet?.maxDeposit || 100000;
    if (amount < minDeposit) {
      throw new ApiError(400, `Minimum deposit amount is ${minDeposit}`);
    }
    if (amount > maxDeposit) {
      throw new ApiError(400, `Maximum deposit amount is ${maxDeposit}`);
    }

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ 
        user: userId, 
        balance: 0, 
        currency: 'INR',
        bonusBalance: 0,
        winningBalance: 0
      });
    }

    // Calculate bonus if applicable
    let bonusAmount = 0;
    if (bonusCode) {
      bonusAmount = walletService.calculateBonus(amount, bonusCode);
    }

    const balanceBefore = wallet.balance;

    // Create transaction
    const transaction = await Transaction.create({
      user: userId,
      wallet: wallet._id,
      type: 'deposit',
      amount,
      status: 'completed',
      paymentMethod,
      reference: transactionId || `DEP-${Date.now()}`,
      description: 'Wallet deposit',
      bonusAmount,
      balanceBefore,
      balanceAfter: balanceBefore + amount + bonusAmount
    });

    // Update wallet
    wallet.balance += amount + bonusAmount;
    if (bonusAmount > 0) {
      wallet.bonusBalance += bonusAmount;
    }
    await wallet.save();

    return { wallet, transaction };
  },

  // Calculate bonus based on promo code
  calculateBonus: (amount, bonusCode) => {
    // Simple bonus calculation - in production this would check against a promo code database
    const promoCodes = {
      'WELCOME10': 0.10,
      'FIRST20': 0.20,
      'DEPO50': 0.50
    };
    
    const bonusPercentage = promoCodes[bonusCode.toUpperCase()] || 0;
    return Math.floor(amount * bonusPercentage);
  },

  // Withdraw money
  withdraw: async (userId, withdrawData) => {
    const { amount, paymentMethod, accountDetails } = withdrawData;

    // Validate amount
    const minWithdrawal = config.wallet?.minWithdrawal || 200;
    if (amount < minWithdrawal) {
      throw new ApiError(400, `Minimum withdrawal amount is ${minWithdrawal}`);
    }

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      throw new ApiError(400, 'Wallet not found');
    }

    // Check balance (can only withdraw from winning balance first, then main balance)
    const totalAvailable = wallet.balance;
    if (totalAvailable < amount) {
      throw new ApiError(400, 'Insufficient balance');
    }

    const balanceBefore = wallet.balance;

    // Create transaction (pending until approved)
    const transaction = await Transaction.create({
      user: userId,
      wallet: wallet._id,
      type: 'withdrawal',
      amount,
      status: 'pending',
      paymentMethod,
      reference: `WD-${Date.now()}`,
      description: 'Withdrawal request',
      balanceBefore,
      balanceAfter: balanceBefore - amount,
      metadata: accountDetails
    });

    // Update wallet
    wallet.balance -= amount;
    await wallet.save();

    return { wallet, transaction };
  },

  // Enter contest
  enterContest: async (userId, contestId, entryFee, useBonus = true) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      throw new ApiError(400, 'Wallet not found');
    }

    // Calculate how much to use from bonus vs real balance
    let bonusUsed = 0;
    let realBalanceUsed = entryFee;

    if (useBonus && wallet.bonusBalance > 0) {
      bonusUsed = Math.min(wallet.bonusBalance, entryFee);
      realBalanceUsed = entryFee - bonusUsed;
    }

    // Check if user has enough balance
    if (wallet.balance < realBalanceUsed) {
      throw new ApiError(400, 'Insufficient balance');
    }

    const balanceBefore = wallet.balance;

    // Create transaction
    const transaction = await Transaction.create({
      user: userId,
      wallet: wallet._id,
      type: 'bet',
      amount: entryFee,
      status: 'completed',
      reference: `CONT-${contestId}-${Date.now()}`,
      description: `Contest entry fee`,
      balanceBefore,
      balanceAfter: balanceBefore - realBalanceUsed,
      metadata: { contestId, bonusUsed }
    });

    // Update wallet
    if (bonusUsed > 0) {
      wallet.bonusBalance -= bonusUsed;
    }
    wallet.balance -= realBalanceUsed;
    await wallet.save();

    return { wallet, transaction };
  },

  // Credit prize money
  creditPrize: async (userId, contestId, prizeAmount, rank) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ 
        user: userId, 
        balance: 0, 
        currency: 'INR',
        bonusBalance: 0,
        winningBalance: 0
      });
    }

    const balanceBefore = wallet.balance;

    // Create transaction
    const transaction = await Transaction.create({
      user: userId,
      wallet: wallet._id,
      type: 'win',
      amount: prizeAmount,
      status: 'completed',
      reference: `PRIZE-${contestId}-R${rank}-${Date.now()}`,
      description: `Contest prize for rank #${rank}`,
      balanceBefore,
      balanceAfter: balanceBefore + prizeAmount,
      metadata: { contestId, rank }
    });

    // Update wallet - prize goes to winning balance
    wallet.balance += prizeAmount;
    wallet.winningBalance += prizeAmount;
    await wallet.save();

    return { wallet, transaction };
  },

  // Transfer between users
  transfer: async (fromUserId, toUserId, amount, description) => {
    if (fromUserId === toUserId) {
      throw new ApiError(400, 'Cannot transfer to yourself');
    }

    if (amount < 100) {
      throw new ApiError(400, 'Minimum transfer amount is 100');
    }

    const fromWallet = await Wallet.findOne({ user: fromUserId });
    if (!fromWallet || fromWallet.balance < amount) {
      throw new ApiError(400, 'Insufficient balance');
    }

    let toWallet = await Wallet.findOne({ user: toUserId });
    if (!toWallet) {
      toWallet = await Wallet.create({ 
        user: toUserId, 
        balance: 0, 
        currency: 'INR',
        bonusBalance: 0,
        winningBalance: 0
      });
    }

    // Debit from sender
    const fromBalanceBefore = fromWallet.balance;
    fromWallet.balance -= amount;
    await fromWallet.save();

    // Credit to receiver
    const toBalanceBefore = toWallet.balance;
    toWallet.balance += amount;
    await toWallet.save();

    // Create transactions for both
    const debitTransaction = await Transaction.create({
      user: fromUserId,
      wallet: fromWallet._id,
      type: 'debit',
      amount,
      status: 'completed',
      reference: `TRANS-${Date.now()}`,
      description: description || 'Wallet transfer',
      balanceBefore: fromBalanceBefore,
      balanceAfter: fromBalanceBefore - amount,
      metadata: { toUserId }
    });

    const creditTransaction = await Transaction.create({
      user: toUserId,
      wallet: toWallet._id,
      type: 'credit',
      amount,
      status: 'completed',
      reference: `TRANS-${Date.now()}`,
      description: description || 'Wallet transfer received',
      balanceBefore: toBalanceBefore,
      balanceAfter: toBalanceBefore + amount,
      metadata: { fromUserId }
    });

    return { 
      debitTransaction, 
      creditTransaction,
      fromWallet,
      toWallet
    };
  },

  // Get transactions
  getTransactions: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const filter = { user: userId };
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter)
    ]);

    return {
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get transaction by ID
  getTransactionById: async (transactionId, userId) => {
    const transaction = await Transaction.findOne({ 
      _id: transactionId, 
      user: userId 
    });
    
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }
    
    return transaction;
  },

  // Get contest transactions
  getContestTransactions: async (userId, contestId) => {
    const transactions = await Transaction.find({
      user: userId,
      'metadata.contestId': contestId
    }).sort({ createdAt: -1 });

    return transactions;
  },

  // Get wallet statement
  getWalletStatement: async (userId, startDate, endDate) => {
    const query = { user: userId };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query).sort({ createdAt: -1 });

    let totalCredits = 0;
    let totalDebits = 0;

    transactions.forEach(t => {
      if (['deposit', 'win', 'credit', 'refund', 'bonus'].includes(t.type)) {
        if (t.status === 'completed') {
          totalCredits += t.amount;
        }
      } else {
        totalDebits += t.amount;
      }
    });

    return {
      transactions,
      summary: {
        totalCredits,
        totalDebits,
        netChange: totalCredits - totalDebits,
        transactionCount: transactions.length
      }
    };
  },

  // Credit (internal use)
  credit: async (userId, amount, description, reference) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ 
        user: userId, 
        balance: 0, 
        currency: 'INR',
        bonusBalance: 0,
        winningBalance: 0
      });
    }

    const transaction = await Transaction.create({
      user: userId,
      wallet: wallet._id,
      type: 'credit',
      amount,
      status: 'completed',
      reference: reference || `SYS-${Date.now()}`,
      description,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance + amount
    });

    wallet.balance += amount;
    await wallet.save();

    return { wallet, transaction };
  },

  // Debit (internal use)
  debit: async (userId, amount, description, reference) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet || wallet.balance < amount) {
      throw new ApiError(400, 'Insufficient balance');
    }

    const transaction = await Transaction.create({
      user: userId,
      wallet: wallet._id,
      type: 'debit',
      amount,
      status: 'completed',
      reference: reference || `SYS-${Date.now()}`,
      description,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance - amount
    });

    wallet.balance -= amount;
    await wallet.save();

    return { wallet, transaction };
  },

  // Add bonus (admin)
  addBonus: async (userId, bonusAmount, description) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ 
        user: userId, 
        balance: 0, 
        currency: 'INR',
        bonusBalance: 0,
        winningBalance: 0
      });
    }

    const transaction = await Transaction.create({
      user: userId,
      wallet: wallet._id,
      type: 'bonus',
      amount: bonusAmount,
      status: 'completed',
      reference: `BONUS-${Date.now()}`,
      description: description || 'Bonus credit',
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance + bonusAmount
    });

    wallet.balance += bonusAmount;
    wallet.bonusBalance += bonusAmount;
    await wallet.save();

    return { wallet, transaction };
  },

  // Get admin overview for dashboard
  getAdminOverview: async () => {
    try {
      const totalBalance = await Wallet.aggregate([
        { $group: { _id: null, total: { $sum: '$balance' } } }
      ]);
      const transactionStats = await Transaction.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } }
      ]);
      const recentTransactions = await Transaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email');
      const deposits = transactionStats.find(t => t._id === 'deposit') || { total: 0 };
      return {
        totalRevenue: totalBalance[0]?.total || 0,
        totalDeposits: deposits.total,
        transactionCount: transactionStats.reduce((acc, t) => acc + t.count, 0),
        recentTransactions
      };
    } catch (error) {
      return { totalRevenue: 0, totalDeposits: 0, transactionCount: 0, recentTransactions: [] };
    }
  }
};

export default walletService;
