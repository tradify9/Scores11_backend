import announcementService from './announcement.service.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiResponse from '../../utils/ApiResponse.js';

const createAnnouncement = catchAsync(async (req, res) => {
  const data = {
    ...req.body,
    createdBy: req.user._id
  };

  const announcement = await announcementService.createAnnouncement(data);
  ApiResponse.success(res, 'Announcement created successfully', announcement, 201);
});

const getAllAnnouncements = catchAsync(async (req, res) => {
  const { page, limit, isActive } = req.query;

  const result = await announcementService.getAllAnnouncements({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
  });

  ApiResponse.success(res, 'Retrieved successfully', result);
});

// Public - the home page ticker feed.
const getActiveAnnouncements = catchAsync(async (req, res) => {
  const announcements = await announcementService.getActiveAnnouncements();
  ApiResponse.success(res, 'Retrieved successfully', announcements);
});

const getAnnouncementById = catchAsync(async (req, res) => {
  const announcement = await announcementService.getAnnouncementById(req.params.id);
  ApiResponse.success(res, 'Retrieved successfully', announcement);
});

const updateAnnouncement = catchAsync(async (req, res) => {
  const announcement = await announcementService.updateAnnouncement(req.params.id, req.body);
  ApiResponse.success(res, 'Announcement updated successfully', announcement);
});

const deleteAnnouncement = catchAsync(async (req, res) => {
  await announcementService.deleteAnnouncement(req.params.id);
  ApiResponse.success(res, 'Announcement deleted successfully', null);
});

const toggleAnnouncementStatus = catchAsync(async (req, res) => {
  const announcement = await announcementService.toggleAnnouncementStatus(req.params.id);
  ApiResponse.success(
    res,
    `Announcement ${announcement.isActive ? 'activated' : 'deactivated'} successfully`,
    announcement
  );
});

const reorderAnnouncements = catchAsync(async (req, res) => {
  const { orderedIds } = req.body;
  const result = await announcementService.reorderAnnouncements(orderedIds);
  ApiResponse.success(res, 'Announcements reordered successfully', result);
});

export {
  createAnnouncement,
  getAllAnnouncements,
  getActiveAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus,
  reorderAnnouncements
};
