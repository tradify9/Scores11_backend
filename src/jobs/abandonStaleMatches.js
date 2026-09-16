import Match from '../modules/match/match.model.js';
import { MATCH_STATUS } from '../constants/matchStatus.js';
import { emitToAll } from '../config/socket.js';

const STALE_AFTER_MS = 8 * 60 * 60 * 1000; // 8 hours

// Statuses a match can be "stuck" in once it has actually started
// (match.actualStartTime is set) but nobody ever completes it.
const IN_PROGRESS_STATUSES = [
  MATCH_STATUS.READY,
  MATCH_STATUS.TEAM_SELECTING,
  MATCH_STATUS.LIVE,
  MATCH_STATUS.PAUSED,
  MATCH_STATUS.DUCKWORTH_LEWIS
];

// Marks matches abandoned rather than deleting them, so scorecards/stats
// already recorded for a genuinely-played match are never lost.
export const abandonStaleMatches = async () => {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const staleMatches = await Match.find({
    status: { $in: IN_PROGRESS_STATUSES },
    actualStartTime: { $exists: true, $lte: cutoff }
  }).select('_id');

  if (!staleMatches.length) return { abandoned: 0 };

  const ids = staleMatches.map((match) => match._id);
  await Match.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        status: MATCH_STATUS.ABANDONED,
        'result.method': 'timeout',
        'result.message': 'Match automatically abandoned - not completed within 8 hours of starting.'
      }
    }
  );

  ids.forEach((id) => emitToAll('matchesUpdated', { _id: id, status: MATCH_STATUS.ABANDONED }));

  console.log(`Stale match cleanup: abandoned ${ids.length} match(es) inactive for 8+ hours`);
  return { abandoned: ids.length };
};

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly

// Runs once on boot, then every hour. Not a precise cron - fine for a
// low-frequency cleanup task like this.
export const scheduleAbandonStaleMatches = () => {
  abandonStaleMatches().catch((error) =>
    console.error('Stale match cleanup: initial run failed:', error.message)
  );
  setInterval(() => {
    abandonStaleMatches().catch((error) =>
      console.error('Stale match cleanup: scheduled run failed:', error.message)
    );
  }, CHECK_INTERVAL_MS);
};

export default scheduleAbandonStaleMatches;
