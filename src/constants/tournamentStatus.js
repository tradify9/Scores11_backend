export const TOURNAMENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  REGISTRATION_OPEN: 'registration_open',
  REGISTRATION_CLOSED: 'registration_closed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended'
};

export const TOURNAMENT_TYPE = {
  KNOCKOUT: 'knockout',
  LEAGUE: 'league',
  HYBRID: 'hybrid',
  PRACTICE: 'practice'
};

export const TOURNAMENT_FORMAT = {
  T20: 't20',
  ODI: 'odi',
  T10: 't10',
  CUSTOM: 'custom'
};

export const POINTS_TABLE_CRITERIA = {
  MATCHES_PLAYED: 'matches_played',
  MATCHES_WON: 'matches_won',
  MATCHES_LOST: 'matches_lost',
  MATCHES_TIED: 'matches_tied',
  NO_RESULT: 'no_result',
  POINTS: 'points',
  NET_RUN_RATE: 'net_run_rate',
  RUNS_SCORED: 'runs_scored',
  RUNS_CONCEDED: 'runs_conceded',
  WICKETS_TAKEN: 'wickets_taken',
  WICKETS_LOST: 'wickets_lost'
};

export const TOURNAMENT_PRIZE_TYPE = {
  CASH: 'cash',
  TROPHY: 'trophy',
  MEDAL: 'medal',
  CERTIFICATE: 'certificate',
  SPONSORED: 'sponsored'
};

export const REGISTRATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WAITLISTED: 'waitlisted'
};

export default TOURNAMENT_STATUS;
