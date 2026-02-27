import { clubService } from './club.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const clubController = {
  createClub: catchAsync(async (req, res) => {
    const club = await clubService.createClub(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Club created', club));
  }),

  getAllClubs: catchAsync(async (req, res) => {
    const clubs = await clubService.getAllClubs(req.query);
    res.json(new ApiResponse(200, 'Clubs retrieved', clubs));
  }),

  getClubById: catchAsync(async (req, res) => {
    const club = await clubService.getClubById(req.params.id);
    res.json(new ApiResponse(200, 'Club retrieved', club));
  }),

  updateClub: catchAsync(async (req, res) => {
    const club = await clubService.updateClub(req.params.id, req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Club updated', club));
  }),

  addMember: catchAsync(async (req, res) => {
    const club = await clubService.addMember(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Member added', club));
  }),

  removeMember: catchAsync(async (req, res) => {
    const { memberId } = req.params;
    const club = await clubService.removeMember(req.params.id, memberId, req.user.userId);
    res.json(new ApiResponse(200, 'Member removed', club));
  }),

  addTeam: catchAsync(async (req, res) => {
    const { teamId } = req.body;
    const club = await clubService.addTeam(req.params.id, teamId, req.user.userId);
    res.json(new ApiResponse(200, 'Team added', club));
  }),

  getClubRankings: catchAsync(async (req, res) => {
    const clubs = await clubService.getClubRankings();
    res.json(new ApiResponse(200, 'Rankings retrieved', clubs));
  }),

  deleteClub: catchAsync(async (req, res) => {
    await clubService.deleteClub(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Club deleted'));
  })
};

export default clubController;
