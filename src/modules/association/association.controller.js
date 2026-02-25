import { associationService } from './association.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const associationController = {
  createAssociation: catchAsync(async (req, res) => {
    const assoc = await associationService.createAssociation(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Association created', assoc));
  }),

  getAllAssociations: catchAsync(async (req, res) => {
    const assocs = await associationService.getAllAssociations(req.query);
    res.json(new ApiResponse(200, 'Associations retrieved', assocs));
  }),

  getAssociationById: catchAsync(async (req, res) => {
    const assoc = await associationService.getAssociationById(req.params.id);
    res.json(new ApiResponse(200, 'Association retrieved', assoc));
  }),

  updateAssociation: catchAsync(async (req, res) => {
    const assoc = await associationService.updateAssociation(req.params.id, req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Association updated', assoc));
  }),

  addMember: catchAsync(async (req, res) => {
    const assoc = await associationService.addMember(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Member added', assoc));
  }),

  addClub: catchAsync(async (req, res) => {
    const { clubId } = req.body;
    const assoc = await associationService.addClub(req.params.id, clubId, req.user.userId);
    res.json(new ApiResponse(200, 'Club added', assoc));
  }),

  deleteAssociation: catchAsync(async (req, res) => {
    await associationService.deleteAssociation(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Association deleted'));
  })
};

export default associationController;
