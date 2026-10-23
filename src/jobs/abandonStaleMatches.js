import Match from '../modules/match/match.model.js';
import { MATCH_STATUS } from '../constants/matchStatus.js';
import { emitToAll } from '../config/socket.js';

// A started match with no score update (ball, toss, innings change) for this
// long is over: the scorer left without finishing it.
const STALE_AFTER_MS = 4 * 60 * 60 * 1000; // 4 hours

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

  // ── 1. In-progress matches with no update for 4+ hours ──────────────────
  // Every ball saves the match, so updatedAt is its last scoring activity.
  // Live/paused matches count even without actualStartTime (older matches
  // never recorded it and stayed "live" for ever).
  const staleMatches = await Match.find({
    updatedAt: { $lte: cutoff },
    $or: [
      { status: { $in: [MATCH_STATUS.LIVE, MATCH_STATUS.PAUSED, MATCH_STATUS.DUCKWORTH_LEWIS] } },
      { status: { $in: IN_PROGRESS_STATUSES }, actualStartTime: { $exists: true, $ne: null } }
    ]
  }).select('_id');

  // ── 2. Issue-13 fix: Scheduled matches whose scheduledDate is >24h in the past
  //       and were never started (no actualStartTime). These would otherwise
  //       sit in the scheduled list forever.
  const PAST_SCHEDULED_CUTOFF_MS = 24 * 60 * 60 * 1000; // 24 hours
  const pastScheduledCutoff = new Date(Date.now() - PAST_SCHEDULED_CUTOFF_MS);
  const pastScheduledMatches = await Match.find({
    status: MATCH_STATUS.SCHEDULED,
    scheduledDate: { $lte: pastScheduledCutoff },
    actualStartTime: { $exists: false },
    isActive: true
  }).select('_id');

  const staleIds = staleMatches.map((m) => m._id);
  const pastScheduledIds = pastScheduledMatches.map((m) => m._id);

  if (!staleIds.length && !pastScheduledIds.length) return { abandoned: 0, cancelled: 0 };

  let abandoned = 0;
  let cancelled = 0;

  if (staleIds.length) {
    await Match.updateMany(
      { _id: { $in: staleIds } },
      {
        $set: {
          status: MATCH_STATUS.ABANDONED,
          'result.method': 'timeout',
          'result.message': 'Match ended automatically - no score update for 4 hours.'
        }
      }
    );
    staleIds.forEach((id) => emitToAll('matchesUpdated', { _id: id, status: MATCH_STATUS.ABANDONED }));
    abandoned = staleIds.length;
    console.log(`Stale match cleanup: ended ${abandoned} match(es) with no update for 4+ hours`);
  }

  if (pastScheduledIds.length) {
    await Match.updateMany(
      { _id: { $in: pastScheduledIds } },
      {
        $set: {
          status: MATCH_STATUS.CANCELLED,
          'result.method': 'expired',
          'result.message': 'Match automatically cancelled - scheduled time passed without starting.'
        }
      }
    );
    pastScheduledIds.forEach((id) => emitToAll('matchesUpdated', { _id: id, status: MATCH_STATUS.CANCELLED }));
    cancelled = pastScheduledIds.length;
    console.log(`Stale match cleanup: cancelled ${cancelled} past-scheduled match(es) that never started`);
  }

  return { abandoned, cancelled };
};

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

// Runs once on boot, then every 15 minutes. Not a precise cron - fine for a
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
