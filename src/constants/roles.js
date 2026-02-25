export const ROLES = {
  ADMIN: 'admin',
  PLAYER: 'player',
  UMPIRE: 'umpire',
  USER: 'user'
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'manage_users',
    'manage_players',
    'manage_teams',
    'manage_tournaments',
    'manage_matches',
    'view_analytics',
    'manage_wallet',
    'manage_notifications',
    'super_admin'
  ],
  [ROLES.PLAYER]: [
    'view_own_profile',
    'update_own_profile',
    'view_matches',
    'participate_in_matches',
    'view_teams',
    'update_player_stats'
  ],
  [ROLES.UMPIRE]: [
    'view_matches',
    'manage_match_scoring',
    'update_match_status',
    'view_teams'
  ],
  [ROLES.USER]: [
    'view_own_profile',
    'update_own_profile',
    'view_matches',
    'view_tournaments',
    'create_team',
    'join_tournament'
  ]
};

export default ROLES;
