import Association from './association.model.js';
import ApiError from '../../utils/ApiError.js';

export const associationService = {
  createAssociation: async (data, userId) => {
    const assoc = await Association.create({ ...data, admin: userId, members: [{ user: userId, role: 'president' }] });
    return assoc;
  },

  getAllAssociations: async (query) => {
    const filter = { isActive: true };
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };
    return Association.find(filter).populate('admin', 'name').sort({ createdAt: -1 });
  },

  getAssociationById: async (id) => {
    const assoc = await Association.findById(id).populate('admin', 'name').populate('members.user', 'name');
    if (!assoc) throw new ApiError(404, 'Association not found');
    return assoc;
  },

  updateAssociation: async (id, userId, data) => {
    const assoc = await Association.findById(id);
    if (!assoc) throw new ApiError(404, 'Association not found');
    if (assoc.admin.toString() !== userId) throw new ApiError(403, 'Not authorized');
    Object.assign(assoc, data);
    await assoc.save();
    return assoc;
  },

  addMember: async (id, userId) => {
    const assoc = await Association.findById(id);
    if (!assoc) throw new ApiError(404, 'Association not found');
    const exists = assoc.members.find(m => m.user.toString() === userId);
    if (exists) throw new ApiError(400, 'Already a member');
    assoc.members.push({ user: userId, role: 'member' });
    await assoc.save();
    return assoc;
  },

  addClub: async (id, clubId, userId) => {
    const assoc = await Association.findById(id);
    if (!assoc) throw new ApiError(404, 'Association not found');
    if (assoc.admin.toString() !== userId) throw new ApiError(403, 'Not authorized');
    if (!assoc.clubs.includes(clubId)) assoc.clubs.push(clubId);
    await assoc.save();
    return assoc;
  },

  deleteAssociation: async (id, userId) => {
    const assoc = await Association.findById(id);
    if (!assoc) throw new ApiError(404, 'Association not found');
    if (assoc.admin.toString() !== userId) throw new ApiError(403, 'Not authorized');
    assoc.isActive = false;
    await assoc.save();
    return { message: 'Association deleted' };
  }
};

export default associationService;
