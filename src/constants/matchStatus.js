export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ABANDONED: 'abandoned',
  DUCKWORTH_LEWIS: 'duckworth_lewis',
  TIE: 'tie',
  WASHED_OUT: 'washed_out'
};

export const INNING_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DECLARED: 'declared'
};

export const OVER_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

export const BALL_RESULT = {
  RUNS: 'runs',
  WICKET: 'wicket',
  WIDE: 'wide',
  NO_BALL: 'no_ball',
  BYE: 'bye',
  LEG_BYE: 'leg_bye'
};

export const WICKET_TYPE = {
  BOWLED: 'bowled',
  CAUGHT: 'caught',
  STUMPED: 'stumped',
  RUN_OUT: 'run_out',
  LBW: 'lbw',
  HIT_WICKET: 'hit_wicket',
  HANDLED_BALL: 'handled_ball',
  TIMED_OUT: 'timed_out'
};

export const MATCH_FORMAT = {
  T20: 't20',
  ODI: 'odi',
  TEST: 'test',
  T10: 't10',
  CUSTOM: 'custom'
};

export const MATCH_TYPE = {
  LEAGUE: 'league',
  KNOCKOUT: 'knockout',
  QUARTER_FINAL: 'quarter_final',
  SEMI_FINAL: 'semi_final',
  FINAL: 'final',
  PRACTICE: 'practice',
  FRIENDLY: 'friendly'
};

export const TOSS_DECISION = {
  BAT: 'bat',
  BOWL: 'bowl'
};

export default MATCH_STATUS;
