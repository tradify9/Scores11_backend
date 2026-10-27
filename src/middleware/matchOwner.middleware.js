import mongoose from 'mongoose';
import Match from '../modules/match/match.model.js';
import ApiError from '../utils/ApiError.js';

/**
 * Live scoring belongs to the person who created the match: only they (or a
 * platform admin, for support) may change its toss, line-up or score.
 * Reads the match id from req.params.matchId or req.params.id.
 */
export const requireMatchOwner = async (req, res, next) => {
  try {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const matchId = req.params.matchId || req.params.id;
    if (!mongoose.isValidObjectId(matchId)) return next(new ApiError(400, 'Invalid match'));

    const match = await Match.findById(matchId).select('createdBy').lean();
    if (!match) return next(new ApiError(404, 'Match not found'));

    const isAdmin = (req.user.role || '').toString().toLowerCase() === 'admin';
    const isCreator = match.createdBy && match.createdBy.toString() === req.user._id.toString();
    if (!isCreator && !isAdmin) {
      return next(new ApiError(403, 'Only the person who created this match can score it.'));
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export default requireMatchOwner;
