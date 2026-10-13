export const BALL_TYPE_PROFILES = {
  leather: {
    label: 'Leather Ball',
    defaultCategory: 'standard',
    applicableFormat: 'standard_professional',
    scoringMultiplier: 1,
    specialRules: []
  },
  tennis: {
    label: 'Tennis Ball',
    defaultCategory: 'casual',
    applicableFormat: 'casual_gully',
    scoringMultiplier: 1,
    specialRules: ['soft_ball_casual_play']
  },
  rubber: {
    label: 'Rubber Ball',
    defaultCategory: 'child',
    applicableFormat: 'child_indoor',
    scoringMultiplier: 1,
    specialRules: ['child_match_bye_zero_counts_one']
  },
  custom: {
    label: 'Custom Ball',
    defaultCategory: 'custom',
    applicableFormat: 'organiser_defined',
    scoringMultiplier: 1,
    specialRules: ['organiser_defined_rules']
  }
};

export const RUN_SCORING_TYPES = [
  { key: 'bat', label: 'Bat runs', batsmanRuns: true, legalDelivery: true, values: [0, 1, 2, 3, 4, 5, 6] },
  { key: 'wide', label: 'Wide', extra: 'wides', automaticRuns: 1, legalDelivery: false },
  { key: 'no_ball', label: 'No ball', extra: 'noBalls', automaticRuns: 1, legalDelivery: false },
  { key: 'bye', label: 'Bye', extra: 'byes', batsmanRuns: false, legalDelivery: true },
  { key: 'leg_bye', label: 'Leg bye', extra: 'legByes', batsmanRuns: false, legalDelivery: true },
  { key: 'penalty', label: 'Penalty runs', extra: 'penalty', batsmanRuns: false, legalDelivery: false },
  { key: 'overthrow', label: 'Overthrows', batsmanRuns: true, legalDelivery: true },
  { key: 'short_run', label: 'Short run adjustment', batsmanRuns: true, legalDelivery: true },
  { key: 'custom', label: 'Custom scorer adjustment', legalDelivery: true }
];

export const WICKET_RULES = [
  { key: 'bowled', label: 'Bowled', countsAsWicket: true, bowlerCredit: true, needsFielder: false, freeHitAllowed: false },
  { key: 'caught', label: 'Caught', countsAsWicket: true, bowlerCredit: true, needsFielder: true, freeHitAllowed: false },
  { key: 'caught_behind', label: 'Caught behind', countsAsWicket: true, bowlerCredit: true, needsFielder: true, freeHitAllowed: false },
  { key: 'caught_and_bowled', label: 'Caught & bowled', countsAsWicket: true, bowlerCredit: true, needsFielder: false, freeHitAllowed: false },
  { key: 'lbw', label: 'LBW', countsAsWicket: true, bowlerCredit: true, needsFielder: false, freeHitAllowed: false },
  { key: 'stumped', label: 'Stumped', countsAsWicket: true, bowlerCredit: true, needsFielder: true, freeHitAllowed: false },
  { key: 'run_out', label: 'Run out', countsAsWicket: true, bowlerCredit: false, needsFielder: true, freeHitAllowed: true },
  { key: 'run_out_non_striker', label: 'Run out non-striker', countsAsWicket: true, bowlerCredit: false, needsFielder: true, freeHitAllowed: true },
  { key: 'hit_wicket', label: 'Hit wicket', countsAsWicket: true, bowlerCredit: true, needsFielder: false, freeHitAllowed: false },
  { key: 'hit_ball_twice', label: 'Hit the ball twice', countsAsWicket: true, bowlerCredit: false, needsFielder: false, freeHitAllowed: true },
  { key: 'obstructing_field', label: 'Obstructing the field', countsAsWicket: true, bowlerCredit: false, needsFielder: false, freeHitAllowed: true },
  { key: 'handled_ball', label: 'Handled the ball', countsAsWicket: true, bowlerCredit: false, needsFielder: false, freeHitAllowed: true },
  { key: 'timed_out', label: 'Timed out', countsAsWicket: true, bowlerCredit: false, needsFielder: false, freeHitAllowed: false },
  { key: 'retired_out', label: 'Retired out', countsAsWicket: true, bowlerCredit: false, needsFielder: false, freeHitAllowed: false },
  { key: 'retired_hurt', label: 'Retired hurt', countsAsWicket: false, bowlerCredit: false, needsFielder: false, freeHitAllowed: true },
  { key: 'retired_not_out', label: 'Retired not out', countsAsWicket: false, bowlerCredit: false, needsFielder: false, freeHitAllowed: true },
  { key: 'absent_hurt', label: 'Absent hurt', countsAsWicket: false, bowlerCredit: false, needsFielder: false, freeHitAllowed: false }
];

export const normalizeWicketType = (wicketType) => {
  const raw = (wicketType || '').toString().trim();
  const normalized = {
    runOut: 'run_out',
    runout: 'run_out',
    run_out_striker: 'run_out',
    mankad: 'run_out_non_striker',
    retire_out: 'retired_out',
    retired: 'retired_hurt',
    retiredhurt: 'retired_hurt',
    absent: 'absent_hurt'
  }[raw] || raw;
  return WICKET_RULES.some(rule => rule.key === normalized) ? normalized : normalized;
};

export const getWicketRule = (wicketType) =>
  WICKET_RULES.find(rule => rule.key === normalizeWicketType(wicketType)) || null;

export const normalizeScoringRules = (rules = {}) => {
  const rawBallType = (rules.ballType || 'leather').toString().toLowerCase();
  const ballType = BALL_TYPE_PROFILES[rawBallType] ? rawBallType : 'leather';
  const profile = BALL_TYPE_PROFILES[ballType];
  const matchCategory = (rules.matchCategory || profile.defaultCategory || 'standard').toString().toLowerCase();
  return {
    ballType,
    matchCategory,
    penaltyOvers: Math.max(0, Number(rules.penaltyOvers || 0)),
    ballProfile: profile
  };
};

export const isChildMatch = (rules = {}) =>
  ['child', 'indoor'].includes(normalizeScoringRules(rules).matchCategory) ||
  normalizeScoringRules(rules).ballType === 'rubber';

export const applyChildMatchDeliveryRules = ({
  runs = 0,
  isBye = false,
  rules = {}
} = {}) => {
  const safeRuns = Number(runs || 0);
  if (isChildMatch(rules) && isBye && safeRuns <= 0) return 1;
  return safeRuns;
};

export const isLegalDelivery = ({
  isWide = false,
  isNoBall = false,
  isPenalty = false
} = {}) => !isWide && !isNoBall && !isPenalty;

export const BOWLING_POINTS = {
  BOWLER_CREDITED_WICKET_TYPES: WICKET_RULES.filter(rule => rule.bowlerCredit).map(rule => rule.key)
};

/**
 * Batting Points — Square-Root Strike Rate Model
 *
 * Formula:  Final Points = (runs / 10) × √(strikeRate / 100)
 * SR = (runs / balls) × 100
 * Benchmark: 10 runs off 10 balls = 1.00 point.
 *
 * @param {number} runs  - Actual runs scored by the batter (excludes extras)
 * @param {number} balls - Actual balls faced (not rounded/displayed value)
 * @returns {{ runs, balls, strikeRate, srFactor, total, formula }}
 */
export const calculateBattingPoints = (runs = 0, balls = 0) => {
  const safeRuns  = Math.max(0, Number(runs  || 0));
  const safeBalls = Math.max(0, Number(balls || 0));

  // If no balls faced (e.g. retired hurt immediately), return 0 — spec rule 5
  if (safeBalls === 0) {
    return {
      runs: safeRuns,
      balls: 0,
      strikeRate: 0,
      srFactor: 0,
      total: 0,
      formula: 'Final Points = (Runs / 10) × √(SR / 100)'
    };
  }

  const strikeRate = (safeRuns / safeBalls) * 100;     // full precision
  const srFactor   = Math.sqrt(strikeRate / 100);       // √(SR / 100)
  const basePoints = safeRuns / 10;                     // Runs / 10
  const total      = basePoints * srFactor;             // final (full precision)

  return {
    runs: safeRuns,
    balls: safeBalls,
    strikeRate: Number(strikeRate.toFixed(4)),
    srFactor:   Number(srFactor.toFixed(6)),
    total:      Number(total.toFixed(4)),               // displayed value rounded to 2 dp by caller
    formula: 'Final Points = (Runs / 10) × √(SR / 100)'
  };
};

/**
 * Wicket points per batting position (PDF §2)
 * Positions 1–5: 2.00 pts each.
 * Position 6+:   2.00 − 0.20 × (position − 5), min 0.
 */
export const wicketPointsForPosition = (battingPosition = 1) => {
  const pos = Math.max(1, Number(battingPosition || 1));
  if (pos <= 5) return 2.00;
  return Math.max(0, 2.00 - 0.20 * (pos - 5));
};

/**
 * Economy adjustment by match format (PDF §3, §4, §5)
 *
 * T20 / ≤30 overs:    clamp((8 − E) / 2, −2, +2)
 * ODI  / >30 overs:   clamp((6 − E) / 2, −2, +2)
 * Test:               0  (economy not used)
 *
 * @param {number} economy     - runs per over (runsConceded / overs)
 * @param {string} matchFormat - match.format value ('t20','odi','test','t10','custom','hundred')
 * @param {number} matchOvers  - total overs for this match (used for custom/hundred)
 */
export const calculateEconomyAdjustment = (economy = 0, matchFormat = 't20', matchOvers = 20) => {
  const fmt   = (matchFormat || '').toString().toLowerCase();
  const E     = Number(economy || 0);
  const overs = Number(matchOvers || 20);

  // Test — no economy adjustment
  if (fmt === 'test') {
    return { adjustment: 0, benchmark: null, format: 'test' };
  }

  // Determine benchmark: ≤30 overs → 8.00, >30 overs → 6.00
  const isShortFormat =
    fmt === 't20'     ||
    fmt === 't10'     ||
    fmt === 'hundred' ||
    (fmt === 'custom' && overs <= 30);

  const isLongFormat =
    fmt === 'odi' ||
    (fmt === 'custom' && overs > 30);

  if (!isShortFormat && !isLongFormat) {
    // Unknown format — default to short-format rule
    return { adjustment: Math.min(2, Math.max(-2, (8 - E) / 2)), benchmark: 8, format: fmt };
  }

  const benchmark = isShortFormat ? 8 : 6;
  const raw       = (benchmark - E) / 2;
  const adjustment = Math.min(2, Math.max(-2, raw));   // clamp(raw, -2, +2)

  return {
    adjustment: Number(adjustment.toFixed(4)),
    benchmark,
    economy: Number(E.toFixed(4)),
    format: fmt
  };
};

/**
 * Bowling Points — Position-Weighted Wickets + Economy Adjustment
 *
 * Formula (PDF §7):
 *   T20 / ≤30 overs:  W + clamp((8 − E) / 2, −2, +2)
 *   ODI  / >30 overs: W + clamp((6 − E) / 2, −2, +2)
 *   Test:             W  (economy not used)
 *
 * where W = sum of wicketPointsForPosition(battingPosition) for each wicket.
 *
 * @param {number}   wickets         - total bowler-credited wickets (fallback when positions unavailable)
 * @param {number[]} wicketPositions - batting positions of each dismissed batter (array)
 * @param {number}   economy         - runs per over
 * @param {string}   matchFormat     - match.format
 * @param {number}   matchOvers      - total overs for the match
 */
export const calculateBowlingPoints = (
  wickets       = 0,
  wicketPositions = [],
  economy       = 0,
  matchFormat   = 't20',
  matchOvers    = 20
) => {
  const safeWickets = Math.max(0, Number(wickets || 0));
  const positions   = Array.isArray(wicketPositions) ? wicketPositions : [];

  // Calculate total wicket points
  let wicketPoints;
  if (positions.length > 0) {
    // Use position-weighted formula
    wicketPoints = positions.reduce((sum, pos) => sum + wicketPointsForPosition(pos), 0);
  } else {
    // Fallback: no position data — treat all wickets as top-order (2.00 each)
    wicketPoints = safeWickets * 2.00;
  }

  const ecoAdj = calculateEconomyAdjustment(economy, matchFormat, matchOvers);
  const total  = Number((wicketPoints + ecoAdj.adjustment).toFixed(4));

  return {
    wickets:         safeWickets,
    wicketPositions: positions,
    wicketPoints:    Number(wicketPoints.toFixed(4)),
    economyAdjustment: ecoAdj.adjustment,
    economyBenchmark:  ecoAdj.benchmark,
    economy:           Number(Number(economy || 0).toFixed(4)),
    total,
    formula: {
      creditedWicketTypes: BOWLING_POINTS.BOWLER_CREDITED_WICKET_TYPES,
      economyFormula: ecoAdj.benchmark
        ? `clamp((${ecoAdj.benchmark} − E) / 2, −2, +2)`
        : 'no economy adjustment (Test)',
      wicketFormula: 'Wᵢ = 2.00 for pos ≤5; 2.00 − 0.20×(pos−5) for pos >5'
    }
  };
};

export const isBowlerCreditedWicket = (wicketType) =>
  BOWLING_POINTS.BOWLER_CREDITED_WICKET_TYPES.includes((wicketType || '').toString());

export const calculateFieldingPointsByPlayer = (balls = []) => {
  const fielding = new Map();
  balls.forEach(ball => {
    const fielderId = ball.wicketFielder?.toString();
    if (!fielderId || !['caught', 'caught_behind', 'run_out', 'run_out_non_striker', 'stumped'].includes(ball.wicketType)) return;
    const current = fielding.get(fielderId) || { dismissals: 0, points: 0 };
    current.dismissals += 1;
    current.points += 0.5;
    fielding.set(fielderId, current);
  });
  return fielding;
};

export const getScoringRuleCatalogue = () => ({
  runTypes: RUN_SCORING_TYPES,
  wicketTypes: WICKET_RULES,
  freeHitAllowedWicketTypes: WICKET_RULES.filter(rule => rule.freeHitAllowed).map(rule => rule.key),
  bowlerCreditedWicketTypes: BOWLING_POINTS.BOWLER_CREDITED_WICKET_TYPES,
  ballTypes: BALL_TYPE_PROFILES,
  rainRules: {
    methods: ['dls', 'par_score', 'revised_target', 'washout', 'abandoned'],
    note: 'DLS-style target uses configurable resource percentage; licensed official DLS tables can replace the resource calculator.'
  }
});

export const calculateDlsStyleTarget = ({
  firstInningsRuns = 0,
  originalOvers = 20,
  revisedOvers = 20,
  wicketsLost = 0,
  inningsNumber = 2
} = {}) => {
  const safeOriginalOvers = Math.max(1, Number(originalOvers || 20));
  const safeRevisedOvers = Math.max(1, Math.min(Number(revisedOvers || safeOriginalOvers), safeOriginalOvers));
  const safeWicketsLost = Math.max(0, Math.min(10, Number(wicketsLost || 0)));
  const oversResource = safeRevisedOvers / safeOriginalOvers;
  const wicketsResource = Math.max(0.35, 1 - (safeWicketsLost * 0.045));
  const resourcePercent = Math.max(20, Math.min(100, oversResource * wicketsResource * 100));
  const parScore = Math.floor(Number(firstInningsRuns || 0) * (resourcePercent / 100));
  return {
    method: 'dls',
    inningsNumber,
    originalOvers: safeOriginalOvers,
    revisedOvers: safeRevisedOvers,
    wicketsLost: safeWicketsLost,
    resourcePercent: Number(resourcePercent.toFixed(2)),
    parScore,
    revisedTarget: parScore + 1,
    note: 'DLS-style par score based on overs and wickets resources.'
  };
};

export const getPenaltyChaseWindow = (match, inningsNumber = 2) => {
  const overs = Number(match?.overs || 20);
  const normalBalls = Math.max(6, Math.round(overs * 6));
  const configuredPenaltyOvers = normalizeScoringRules(match?.scoringRules).penaltyOvers;
  const penaltyApplies = inningsNumber === 2 && configuredPenaltyOvers > 0;
  const penaltyOvers = penaltyApplies
    ? Math.min(configuredPenaltyOvers, Math.max(0, overs - 1))
    : 0;
  const penaltyBalls = Math.round(penaltyOvers * 6);
  const effectiveBalls = Math.max(6, normalBalls - penaltyBalls);

  return {
    applies: penaltyApplies,
    appliesToInnings: 2,
    appliesToTeam: 'team2_chasing',
    remainingOversOnly: true,
    normalOvers: overs,
    normalBalls,
    penaltyOvers,
    penaltyBalls,
    effectiveOvers: effectiveBalls / 6,
    effectiveBalls
  };
};

export const getEffectiveChaseBalls = (match, inningsNumber = 2) => {
  return getPenaltyChaseWindow(match, inningsNumber).effectiveBalls;
};

export const calculateChaseState = (match, innings) => {
  const firstInnings = match?.innings?.find(i => i.inningsNumber === 1) || match?.innings?.[0];
  if (!firstInnings || !innings) return null;

  // A rain/DLS revision (applyRainDls) stores the revised target on
  // match.result.dls. Without this check, every ball recomputed target
  // from raw first-innings runs and silently reverted the revised target
  // back to the pre-rain value on the very next delivery. Re-applying
  // DLS overwrites match.result.dls wholesale, so this also naturally
  // supports a later re-revision of the target.
  const dlsRevision = match?.result?.dls;
  const hasDlsTarget = dlsRevision?.inningsNumber === (innings.inningsNumber || 2)
    && Number.isFinite(dlsRevision?.revisedTarget);
  const target = hasDlsTarget
    ? dlsRevision.revisedTarget
    : Number(firstInnings.totalRuns || 0) + 1;
  const legalBallsBowled = (Number(innings.totalOvers || 0) * 6) + Number(innings.totalBalls || 0);
  const penaltyWindow = getPenaltyChaseWindow(match, innings.inningsNumber || 2);
  const effectiveBalls = penaltyWindow.effectiveBalls;
  const ballsRemaining = Math.max(0, effectiveBalls - legalBallsBowled);
  const requiredRuns = Math.max(0, target - Number(innings.totalRuns || 0));

  return {
    target,
    requiredRuns,
    requiredBalls: ballsRemaining,
    requiredRunRate: ballsRemaining > 0 ? (requiredRuns / (ballsRemaining / 6)).toFixed(2) : '0.00',
    penaltyOvers: penaltyWindow.penaltyOvers,
    penaltyBalls: penaltyWindow.penaltyBalls,
    normalOvers: penaltyWindow.normalOvers,
    effectiveOvers: penaltyWindow.effectiveOvers,
    penaltyApplies: penaltyWindow.applies,
    penaltyScope: penaltyWindow.remainingOversOnly ? 'remaining_overs_only' : 'none'
  };
};
