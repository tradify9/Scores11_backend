import User from '../modules/user/user.model.js';
import Player from '../modules/player/player.model.js';
import Team from '../modules/team/team.model.js';
import Wallet from '../modules/wallet/wallet.model.js';
import Transaction from '../modules/wallet/transaction.model.js';
import { Post } from '../modules/community/post.model.js';
import { Chat, Message } from '../modules/chat/chat.model.js';
import { deleteImage } from '../config/cloudinary.js';

const PURGE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Hard-deletes a single soft-deleted user and cascades cleanup of the data
// named in the account-deletion requirement: Player profile, team
// memberships, wallet, posts/comments, chat messages, and the uploaded
// avatar. Each step is best-effort so one failure doesn't block the rest.
const purgeUser = async (user) => {
  const userId = user._id;

  try {
    const players = await Player.find({ user: userId }).select('_id');
    const playerIds = players.map((p) => p._id);
    if (playerIds.length) {
      await Team.updateMany(
        { players: { $in: playerIds } },
        { $pull: { players: { $in: playerIds } } }
      );
      await Team.updateMany(
        { captain: { $in: playerIds } },
        { $unset: { captain: '' } }
      );
      await Team.updateMany(
        { viceCaptain: { $in: playerIds } },
        { $unset: { viceCaptain: '' } }
      );
    }
    await Player.deleteMany({ user: userId });
  } catch (error) {
    console.error(`Purge: player/team cleanup failed for ${userId}:`, error.message);
  }

  try {
    await Transaction.deleteMany({ user: userId });
    await Wallet.deleteOne({ user: userId });
  } catch (error) {
    console.error(`Purge: wallet cleanup failed for ${userId}:`, error.message);
  }

  try {
    await Post.deleteMany({ user: userId });
    await Post.updateMany(
      {},
      { $pull: { comments: { user: userId }, likes: userId } }
    );
  } catch (error) {
    console.error(`Purge: community cleanup failed for ${userId}:`, error.message);
  }

  try {
    await Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });
    await Chat.deleteMany({ participants: userId });
  } catch (error) {
    console.error(`Purge: chat cleanup failed for ${userId}:`, error.message);
  }

  try {
    if (user.avatar?.publicId) {
      await deleteImage(user.avatar.publicId);
    }
  } catch (error) {
    console.error(`Purge: avatar cleanup failed for ${userId}:`, error.message);
  }

  await User.findByIdAndDelete(userId);
};

export const purgeDeletedAccounts = async () => {
  const cutoff = new Date(Date.now() - PURGE_AFTER_MS);
  const dueUsers = await User.find({
    isDeleted: true,
    deletedAt: { $lte: cutoff }
  }).select('_id avatar');

  if (!dueUsers.length) return { purged: 0 };

  let purged = 0;
  for (const user of dueUsers) {
    try {
      await purgeUser(user);
      purged += 1;
    } catch (error) {
      console.error(`Purge: failed to purge user ${user._id}:`, error.message);
    }
  }
  console.log(`Purge: hard-deleted ${purged} account(s) past their 30-day retention window`);
  return { purged };
};

const DAILY_MS = 24 * 60 * 60 * 1000;

// Runs once on boot, then every 24h. Not a precise cron - fine for a
// low-frequency cleanup task like this.
export const schedulePurgeDeletedAccounts = () => {
  purgeDeletedAccounts().catch((error) =>
    console.error('Purge: initial run failed:', error.message)
  );
  setInterval(() => {
    purgeDeletedAccounts().catch((error) =>
      console.error('Purge: scheduled run failed:', error.message)
    );
  }, DAILY_MS);
};

export default schedulePurgeDeletedAccounts;
