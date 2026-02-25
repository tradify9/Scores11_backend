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
    if (amount < config.wallet.minDeposit) {
      throw new ApiError(400, `Minimum deposit amount is ${config.wallet.minDeposit}`);
    }
    if (amount > config.wallet.maxDeposit) {
      throw new ApiError(400, `Maximum deposit amount is ${config.wallet.maxDeposit}`);
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

    // Create transaction
    const transaction = await Transaction.create({
      user: userId,
      type: 'DEPOSIT',
      amount,
      status: 'COMPLETED',
      paymentMethod,
      reference: transactionId || `DEP-${Date.now()}`,
      description: 'Wallet deposit',
      bonusAmount,
      finalAmount: amount + bonusAmount
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
    // Example bonus codes - can be moved to database
    const bonusCodes = {
      'WELCOME10': { type: 'percentage', value: 10, maxBonus: 500 },
      'WELCOME20': { type: 'percentage', value: 20, maxBonus: 1000 },
      'DEPOSIT50': { type: 'flat', value: 50 },
      'DEPOSIT100': { type: 'flat', value: 100 }
    };

    const code = bonusCodes[bonusCode.toUpperCase()];
    if (!code) return 0;

    if (code.type === 'percentage') {
      const bonus = (amount * code.value) / 100;
      return Math.min(bonus, code.maxBonus);
    } else {
      return code.value;
    }
  },

  // Withdraw money
  withdraw: async (userId, withdrawData) => {
    const { amount, accountDetails, ifscCode, bankName, upiId } = withdrawData;

    // Validate amount
    if (amount < config.wallet.minWithdrawal) {
      throw new ApiError(400, `Minimum withdrawal amount is ${config.wallet.minWithdrawal}`);
    }

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      throw new ApiError(400, 'Wallet not found');
    }

    // Check balance (can only withdraw from winning balance + balance, not bonus)
    const availableBalance = wallet.balance - wallet.bonusBalance;
    if (availableBalance < amount) {
      throw new ApiError(400, 'Insufficient balance. Bonus balance cannot be withdrawn.');
    }

    // Create pending transaction
    const transaction = await Transaction.create({
      user: userId,
      type: 'WITHDRAWAL',
      amount,
      status: 'PENDING',
      reference: `WTH-${Date.now()}`,
      description: 'Wallet withdrawal',
      accountDetails: {
        bankName,
        accountNumber: accountDetails,
        ifscCode,
        upiId
      }
    });

    // Deduct from wallet
    wallet.balance -= amount;
    // Deduct proportionally from winning balance first, then from balance
    if (wallet.winningBalance >= amount) {
      wallet.winningBalance -= amount;
    } else {
      const remaining = amount - wallet.winningBalance;
      wallet.winningBalance = 0;
      wallet.balance -= remaining;
    }
    await wallet.save();

    return { wallet, transaction };
  },

  // Enter contest (deduct entry fee)
  enterContest: async (userId, contestId, entryFee, useBonus = false) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      throw new ApiError(400, 'Wallet not found');
    }

    // Calculate how much from bonus and real balance
    let bonusUsed = 0;
    let realAmountUsed = entryFee;

    if (useBonus && wallet.bonusBalance > 0) {
      bonusUsed = Math.min(wallet.bonusBalance, entryFee);
      realAmountUsed = entryFee - bonusUsed;
    }

    // Check if user has enough balance
    if (wallet.balance < entryFee) {
      throw new ApiError(400, 'Insufficient balance');
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: userId,
      type: 'DEBIT',
      amount: entryFee,
      status: 'COMPLETED',
      reference: `CONTEST-${contestId}-${Date.now()}`,
      description: `Contest entry fee`,
      bonusAmount: bonusUsed,
      relatedContest: contestId
    });

    // Update wallet
    wallet.balance -= entryFee;
    wallet.bonusBalance -= bonusUsed;
    await wallet.save();

    return { wallet, transaction };
  },

  // Win contest (credit prize money)
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

    // Winnings go to winning balance (can be withdrawn)
    const transaction = await Transaction.create({
      user: userId,
      type: 'CREDIT',
      amount: prizeAmount,
      status: 'COMPLETED',
      reference: `PRIZE-${contestId}-${Date.now()}`,
      description: `Contest prize - Rank #${rank}`,
      relatedContest: contestId
    });

    wallet.balance += prizeAmount;
    wallet.winningBalance += prizeAmount;
    await wallet.save();

    return { wallet, transaction };
  },

  // Refund contest entry
  refundEntry: async (userId, contestId, entryFee) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      throw new ApiError(400, 'Wallet not found');
    }

    const transaction = await Transaction.create({
      user: userId,
      type: 'CREDIT',
      amount: entryFee,
      status: 'COMPLETED',
      reference: `REFUND-${contestId}-${Date.now()}`,
      description: 'Contest entry refunded',
      relatedContest: contestId
    });

    wallet.balance += entryFee;
    await wallet.save();

    return { wallet, transaction };
  },

  // Transfer between users
  transfer: async (fromUserId, toUserId, amount, description) => {
    const fromWallet = await Wallet.findOne({ user: fromUserId });
    if (!fromWallet || fromWallet.balance < amount) {
      throw new ApiError(400, 'Insufficient balance');
    }

    const toWallet = await Wallet.findOne({ user: toUserId });
    if (!toWallet) {
      throw new ApiError(400, 'Recipient wallet not found');
    }

    // Create transactions
    const debitTransaction = await Transaction.create({
      user: fromUserId,
      type: 'DEBIT',
      amount,
      status: 'COMPLETED',
      reference: `TRANS-${Date.now()}`,
      description: description || 'Transfer to user',
      relatedUser: toUserId
    });

    const creditTransaction = await Transaction.create({
      user: toUserId,
      type: 'CREDIT',
      amount,
      status: 'COMPLETED',
      reference: `TRANS-${Date.now()}`,
      description: description || 'Received from user',
      relatedUser: fromUserId
    });

    // Update wallets
    fromWallet.balance -= amount;
    await fromWallet.save();

    toWallet.balance += amount;
    await toWallet.save();

    return { 
      fromWallet, 
      toWallet, 
      debitTransaction, 
      creditTransaction 
    };
  },

  // Get transaction history
  getTransactions: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const filter = { user: userId };
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.startDate && query.endDate) {
      filter.createdAt = {
        $gte: new Date(query.startDate),
        $lte: new Date(query.endDate)
      };
    }

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
    const transaction = await Transaction.findOne({ _id: transactionId, user: userId });
    if (!transaction) throw new ApiError(404, 'Transaction not found');
    return transaction;
  },

  // Get transactions by contest
  getContestTransactions: async (userId, contestId) => {
    const transactions = await Transaction.find({ 
      user: userId, 
      relatedContest: contestId 
    }).sort({ createdAt: -1 });
    return transactions;
  },

  // Internal credit (for system use)
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
      type: 'CREDIT',
      amount,
      status: 'COMPLETED',
      reference: reference || `SYS-${Date.now()}`,
      description
    });

    wallet.balance += amount;
    await wallet.save();

    return { wallet, transaction };
  },

  // Internal debit (for system use)
  debit: async (userId, amount, description, reference) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet || wallet.balance < amount) {
      throw new ApiError(400, 'Insufficient balance');
    }

    const transaction = await Transaction.create({
      user: userId,
      type: 'DEBIT',
      amount,
      status: 'COMPLETED',
      reference: reference || `SYS-${Date.now()}`,
      description
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
      type: 'CREDIT',
      amount: bonusAmount,
      status: 'COMPLETED',
      reference: `BONUS-${Date.now()}`,
      description: description || 'Bonus credit',
      bonusAmount
    });

    wallet.balance += bonusAmount;
    wallet.bonusBalance += bonusAmount;
    await wallet.save();

    return { wallet, transaction };
  },

  // Get wallet statement
  getWalletStatement: async (userId, startDate, endDate) => {
    const transactions = await Transaction.find({
      user: userId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ createdAt: -1 });

    let totalCredits = 0;
    let totalDebits = 0;

    transactions.forEach(t => {
      if (t.type === 'CREDIT' || (t.type === 'DEPOSIT' && t.status === 'COMPLETED')) {
        totalCredits += t.amount;
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
  }
};

export default walletService;
