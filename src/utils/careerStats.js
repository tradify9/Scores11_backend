import Match from '../modules/match/match.model.js';

const toId = (value) => (value?._id || value?.id || value)?.toString();
const num = (value) => Number(value) || 0;

// Bowling figures are stored as cricket overs (3.4 = 3 overs 4 balls).
const oversToBalls = (overs) => {
  const [o, b = '0'] = (overs ?? 0).toString().split('.');
  return (parseInt(o, 10) || 0) * 6 + Math.min(parseInt(b, 10) || 0, 5);
};

const NOT_DISMISSED = new Set(['not_out', 'retired_hurt', '', 'dnb', 'did_not_bat']);

export const CAREER_SCOPES = ['all', 'matches', 'tournaments', 'practice'];

// Which matches a profile filter chip covers.
const scopeFilter = (scope) => {
  switch (scope) {
    case 'tournaments':
      return { tournament: { $exists: true, $ne: null } };
    case 'practice':
      return { matchType: 'practice' };
    case 'matches':
      return { $and: [{ $or: [{ tournament: { $exists: false } }, { tournament: null }] }, { matchType: { $ne: 'practice' } }] };
    default:
      return {};
  }
};

/**
 * Career batting and bowling figures for a person, built from the match
 * scorecards themselves (Player.stats is not updated by live scoring).
 * `playerIds` may hold several Player records: the same person is often
 * registered once per team.
 */
export const computeCareerStats = async (playerIds = [], { scope = 'all' } = {}) => {
  const ids = [...new Set(playerIds.filter(Boolean).map(String))];
  const keys = new Set(ids);
  const empty = buildResult({});
  if (!ids.length) return empty;

  const matches = await Match.find({
    isActive: { $ne: false },
    ...scopeFilter(CAREER_SCOPES.includes(scope) ? scope : 'all'),
    $or: [
      { 'innings.battingScorecard.batsman': { $in: ids } },
      { 'innings.bowlingScorecard.bowler': { $in: ids } }
    ]
  })
    .select('innings')
    .lean();

  const t = {
    matchIds: new Set(),
    innings: 0, notOuts: 0, dismissals: 0, runs: 0, balls: 0, fours: 0, sixes: 0,
    highestScore: 0, highestNotOut: false, fifties: 0, hundreds: 0, ducks: 0,
    bowlingInnings: 0, wickets: 0, ballsBowled: 0, runsConceded: 0, maidens: 0,
    fourWickets: 0, fiveWickets: 0, bestW: 0, bestR: 0, bestSet: false
  };

  for (const match of matches) {
    let appeared = false;
    for (const inning of match.innings || []) {
      for (const card of inning.battingScorecard || []) {
        if (!keys.has(toId(card.batsman))) continue;
        appeared = true;
        const runs = num(card.runs);
        const balls = num(card.balls);
        const howOut = (card.howOut || 'not_out').toString().toLowerCase();
        const out = !NOT_DISMISSED.has(howOut);
        // The playing XI is pre-filled with 0(0) not-out rows: only count an
        // innings once the batter actually faced a ball or was dismissed.
        if (balls === 0 && runs === 0 && !out) continue;
        t.innings += 1;
        t.runs += runs;
        t.balls += balls;
        t.fours += num(card.fours);
        t.sixes += num(card.sixes);
        if (out) t.dismissals += 1; else t.notOuts += 1;
        if (runs > t.highestScore || (runs === t.highestScore && !out)) {
          t.highestScore = runs;
          t.highestNotOut = !out;
        }
        if (runs >= 100) t.hundreds += 1;
        else if (runs >= 50) t.fifties += 1;
        if (runs === 0 && out) t.ducks += 1;
      }
      for (const card of inning.bowlingScorecard || []) {
        if (!keys.has(toId(card.bowler))) continue;
        const balls = num(card.balls) || oversToBalls(card.overs);
        const wickets = num(card.wickets);
        const conceded = num(card.runsConceded ?? card.runs);
        if (balls === 0 && wickets === 0) continue;
        appeared = true;
        t.bowlingInnings += 1;
        t.ballsBowled += balls;
        t.wickets += wickets;
        t.runsConceded += conceded;
        t.maidens += num(card.maidens);
        if (wickets >= 5) t.fiveWickets += 1;
        else if (wickets >= 4) t.fourWickets += 1;
        if (!t.bestSet || wickets > t.bestW || (wickets === t.bestW && conceded < t.bestR)) {
          t.bestSet = true;
          t.bestW = wickets;
          t.bestR = conceded;
        }
      }
    }
    if (appeared) t.matchIds.add(match._id.toString());
  }
  return buildResult(t);
};

const fixed = (value, digits = 2) => Number((Number(value) || 0).toFixed(digits));

function buildResult(t) {
  const matches = t.matchIds?.size || 0;
  const runs = t.runs || 0;
  const balls = t.balls || 0;
  const dismissals = t.dismissals || 0;
  const ballsBowled = t.ballsBowled || 0;
  const wickets = t.wickets || 0;
  const conceded = t.runsConceded || 0;

  const average = dismissals > 0 ? fixed(runs / dismissals) : null;
  const strikeRate = balls > 0 ? fixed((runs / balls) * 100) : 0;
  const economy = ballsBowled > 0 ? fixed(conceded / (ballsBowled / 6)) : 0;
  const bowlingAverage = wickets > 0 ? fixed(conceded / wickets) : null;
  const bowlingStrikeRate = wickets > 0 ? fixed(ballsBowled / wickets, 1) : null;
  const bestBowling = ballsBowled > 0 || wickets > 0 ? `${t.bestW || 0}/${t.bestR || 0}` : '-';
  const highest = `${t.highestScore || 0}${t.highestNotOut ? '*' : ''}`;
  const oversBowled = `${Math.floor(ballsBowled / 6)}.${ballsBowled % 6}`;

  return {
    // short keys (header, leaderboard style)
    matches,
    innings: t.innings || 0,
    runs,
    balls,
    fours: t.fours || 0,
    sixes: t.sixes || 0,
    wickets,
    average: average ?? 0,
    strikeRate,
    economy,
    highestScore: t.highestScore || 0,
    highestScoreDisplay: highest,
    // long keys (stats tables in the app)
    matchesPlayed: matches,
    totalRuns: runs,
    totalWickets: wickets,
    notOuts: t.notOuts || 0,
    battingAverage: average == null ? '-' : average.toFixed(2),
    centuries: t.hundreds || 0,
    hundreds: t.hundreds || 0,
    halfCenturies: t.fifties || 0,
    fifties: t.fifties || 0,
    ducks: t.ducks || 0,
    bowlingInnings: t.bowlingInnings || 0,
    oversBowled,
    ballsBowled,
    runsConceded: conceded,
    maidens: t.maidens || 0,
    bowlingAverage: bowlingAverage == null ? '-' : bowlingAverage.toFixed(2),
    bowlingStrikeRate: bowlingStrikeRate == null ? '-' : bowlingStrikeRate.toFixed(1),
    bestBowling,
    fourWicketHauls: t.fourWickets || 0,
    fiveWicketHauls: t.fiveWickets || 0
  };
}

export default computeCareerStats;
