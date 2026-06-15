export const MATCH_STATUS = {
SCHEDULED: 'scheduled',
  READY: 'ready',
  TEAM_SELECTING: 'team_selecting',
  LIVE: 'live',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ABANDONED: 'abandoned',
  DUCKWORTH_LEWIS: 'duckworth_lewis',
  TIE: 'tie',
  WASHED_OUT: 'washed_out'
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

export const WICKET_TYPE = {
  BOWLED: 'bowled',
  CAUGHT: 'caught',
  CAUGHT_BEHIND: 'caught_behind',
  CAUGHT_AND_BOWLED: 'caught_and_bowled',
  STUMPED: 'stumped',
  RUN_OUT: 'run_out',
  RUN_OUT_NON_STRIKER: 'run_out_non_striker',
  LBW: 'lbw',
  HIT_WICKET: 'hit_wicket',
  HANDLED_BALL: 'handled_ball',
  TIMED_OUT: 'timed_out',
  OBSTRUCTING_FIELD: 'obstructing_field',
  HIT_BALL_TWICE: 'hit_ball_twice',
  RETIRED_HURT: 'retired_hurt',
  RETIRED_OUT: 'retired_out',
  RETIRED_NOT_OUT: 'retired_not_out',
  ABSENT_HURT: 'absent_hurt'
};

export const BALL_RESULT = {
  RUNS: 'runs',
  WICKET: 'wicket',
  WIDE: 'wide',
  NO_BALL: 'no_ball',
  BYE: 'bye',
  LEG_BYE: 'leg_bye'
};

export default MATCH_STATUS;
