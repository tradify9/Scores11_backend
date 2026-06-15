import { teamService } from './team.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const teamController = {
  // Create a new team
  createTeam: catchAsync(async (req, res) => {
    const team = await teamService.createTeam(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Team created successfully', team));
  }),

  // Get team by ID
  getTeamById: catchAsync(async (req, res) => {
    const team = await teamService.getTeamById(req.params.id);
    res.json(new ApiResponse(200, 'Team retrieved', team));
  }),

  // Get team by ID (public)
  getTeamByIdPublic: catchAsync(async (req, res) => {
    const team = await teamService.getTeamByIdPublic(req.params.id);
    res.json(new ApiResponse(200, 'Team retrieved', team));
  }),

  // Update team
  updateTeam: catchAsync(async (req, res) => {
    const team = await teamService.updateTeam(req.params.id, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Team updated successfully', team));
  }),

  // Delete team
  deleteTeam: catchAsync(async (req, res) => {
    await teamService.deleteTeam(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Team deleted successfully'));
  }),

  // Get all teams with filters
  getAllTeams: catchAsync(async (req, res) => {
    const { teams, pagination } = await teamService.getAllTeams(req.query);
    res.json(new ApiResponse(200, 'Teams retrieved', teams, pagination));
  }),

  // Get teams by owner
  getMyTeams: catchAsync(async (req, res) => {
    const teams = await teamService.getTeamsByOwner(req.user.userId);
    res.json(new ApiResponse(200, 'Your teams retrieved', teams));
  }),

  // Add player to team
  addPlayer: catchAsync(async (req, res) => {
    const team = await teamService.addPlayer(
      req.params.id,
      req.body,
      req.user.userId,
      req.body.matchId
    );
    res.json(new ApiResponse(200, 'Player added to team', team));
  }),

  createInviteLink: catchAsync(async (req, res) => {
    const invite = await teamService.createInviteLink(req.params.id, req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Team invite link created', invite));
  }),

  getInviteInfo: catchAsync(async (req, res) => {
    const invite = await teamService.getInviteInfo(req.params.code);
    const wantsJson = (req.get('accept') || '').includes('application/json');
    if (!wantsJson) {
      return res.type('html').send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Join ${invite.teamName}</title>
  <style>
    body{font-family:Arial,sans-serif;background:#f8f9fc;margin:0;padding:24px;color:#0f172a}
    .card{max-width:480px;margin:0 auto;background:#fff;border:1px solid #e8ecf4;border-radius:18px;padding:22px;box-shadow:0 8px 24px rgba(15,23,42,.08)}
    h1{margin:0 0 8px;font-size:24px} p{color:#64748b;line-height:1.45}
    input,select,button{width:100%;box-sizing:border-box;margin-top:10px;padding:13px;border-radius:12px;border:1px solid #dbe3f0;font-size:15px}
    button{background:#4f8ef7;color:#fff;font-weight:700;border:0;cursor:pointer}
  </style>
</head>
<body>
  <div class="card">
    <h1>Join ${invite.teamName}</h1>
    <p>${invite.playersCount} players already in squad. Enter your details to join this team.</p>
    <form method="post" action="/api/v1/teams/invite/${req.params.code}/join">
      <input name="name" placeholder="Player name" required />
      <input name="phone" placeholder="Mobile number" />
      <input name="email" type="email" placeholder="Email address" />
      <select name="role">
        <option value="batsman">Batsman</option>
        <option value="bowler">Bowler</option>
        <option value="all-rounder">All-rounder</option>
        <option value="wicket-keeper">Wicket keeper</option>
      </select>
      <button type="submit">Join Team</button>
    </form>
  </div>
</body>
</html>`);
    }
    res.json(new ApiResponse(200, 'Team invite loaded', invite));
  }),

  joinByInvite: catchAsync(async (req, res) => {
    const result = await teamService.joinByInvite(req.params.code, req.body);
    const wantsJson = (req.get('accept') || '').includes('application/json');
    if (!wantsJson) {
      return res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Joined Team</title></head><body style="font-family:Arial,sans-serif;background:#f8f9fc;padding:24px"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:18px;padding:22px;border:1px solid #e8ecf4"><h1>Joined successfully</h1><p>${result.message}</p></div></body></html>`);
    }
    res.status(201).json(new ApiResponse(201, 'Player joined team', result));
  }),

  // Remove player from team
  removePlayer: catchAsync(async (req, res) => {
    const team = await teamService.removePlayer(req.params.id, req.body.playerId, req.user.userId);
    res.json(new ApiResponse(200, 'Player removed from team', team));
  }),

  // Set team captain
  setCaptain: catchAsync(async (req, res) => {
    const team = await teamService.setCaptain(req.params.id, req.body.playerId, req.user.userId);
    res.json(new ApiResponse(200, 'Captain set successfully', team));
  }),

  // Set team vice-captain
  setViceCaptain: catchAsync(async (req, res) => {
    const team = await teamService.setViceCaptain(req.params.id, req.body.playerId, req.user.userId);
    res.json(new ApiResponse(200, 'Vice-captain set successfully', team));
  }),

  // Upload team logo
  uploadLogo: catchAsync(async (req, res) => {
    const team = await teamService.uploadLogo(req.params.id, req.file, req.user.userId);
    res.json(new ApiResponse(200, 'Team logo uploaded', team));
  }),

  // Get team rankings
  getTeamRankings: catchAsync(async (req, res) => {
    const { teams, pagination } = await teamService.getTeamRankings(req.query);
    res.json(new ApiResponse(200, 'Team rankings retrieved', teams, pagination));
  }),

  // Search teams
  searchTeams: catchAsync(async (req, res) => {
    const teams = await teamService.searchTeams(req.query.q, req.query.limit);
    res.json(new ApiResponse(200, 'Teams found', teams));
  }),

  // Transfer team ownership
  transferOwnership: catchAsync(async (req, res) => {
    const team = await teamService.transferOwnership(req.params.id, req.body.newOwnerId, req.user.userId);
    res.json(new ApiResponse(200, 'Team ownership transferred', team));
  }),

  // Verify team (admin)
  verifyTeam: catchAsync(async (req, res) => {
    const team = await teamService.verifyTeam(req.params.id);
    res.json(new ApiResponse(200, 'Team verified successfully', team));
  }),

  // Get team matches
  getTeamMatches: catchAsync(async (req, res) => {
    const { matches, pagination } = await teamService.getTeamMatches(req.params.id, req.query);
    res.json(new ApiResponse(200, 'Team matches retrieved', matches, pagination));
  })
};

export default teamController;
