export const ERROR_MESSAGES = {
  // Authentication Errors
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
  AUTH_USER_NOT_FOUND: 'User not found',
  AUTH_USER_ALREADY_EXISTS: 'User already exists with this email',
  AUTH_TOKEN_EXPIRED: 'Token has expired',
  AUTH_TOKEN_INVALID: 'Invalid token',
  AUTH_UNAUTHORIZED: 'Unauthorized access',
  ACCESS_DENIED: 'Access denied. Insufficient permissions',
  
  // Validation Errors
  VALIDATION_ERROR: 'Validation failed',
  
  // User Errors
  USER_NOT_FOUND: 'User not found', 
  USER_ALREADY_EXISTS: 'User already exists', 
  USER_PROFILE_UPDATE_FAILED: 'Failed to update user profile', 
  
  // Team Errors  
  TEAM_NOT_FOUND: 'Team not found', 
  TEAM_ALREADY_EXISTS: 'Team already exists', 
  TEAM_NAME_REQUIRED: 'Team name is required', 
  
  // Player Errors  
  PLAYER_NOT_FOUND: 'Player not found', 
  PLAYER_ALREADY_EXISTS: 'Player already exists in team',

  // Match Errors    
  MATCH_NOT_FOUND: 'Match not found',     
  MATCH_ALREADY_SCHEDULED: 'Match is already scheduled at this time',   
  
  // Tournament Errors      
  TOURNAMENT_NOT_FOUND: 'Tournament not found',       
  TOURNAMENT_REGISTRATION_CLOSED: 'Registration for tournament is closed',
  
  // Wallet errors        
  WALLET_INSUFFICIENT_BALANCE: 'Insufficient wallet balance',
  
  // Notification Error
  NOTIFICATION_SEND_FAILED: 'Failed to send notification',
  
  // General Server Error
  INTERNAL_SERVER_ERROR: 'Internal server error occurred'
};

export const SUCCESS_MESSAGES = {
  // Auth Success Messages
  LOGIN_SUCCESS: 'Login successful',
  REGISTER_SUCCESS: 'Registration successful', 
  
  // User Success Messages   
  PROFILE_UPDATED: 'Profile updated successfully',

  // Team Success Messages     
  TEAM_CREATED: 'Team created successfully',       
  TEAM_UPDATED: 'Team updated successfully',
  
  // Player Success Messages           
  PLAYER_ADDED: 'Player added to team successfully',
  
  // Match success messages             
  MATCH_CREATED: 'Match created successfully',               
  MATCH_UPDATED: 'Match status updated',
  
  // Tournament success messages               
  TOURNAMENT_CREATED: 'Tournament created successfully',               
  TOURNAMENT_UPDATED: 'Tournament updated',
  REGISTRATION_SUCCESSFUL: 'Registration completed',
  
  // Wallet
  TRANSACTION_COMPLETED: 'Transaction completed',
  DEPOSIT_SUCCESSFUL: 'Deposit successful', 
  WITHDRAWAL_REQUEST_SUBMITTED: 'Withdrawal request submitted'
};
 export default ERROR_MESSAGES;
