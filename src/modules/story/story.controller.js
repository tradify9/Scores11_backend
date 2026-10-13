import storyService from './story.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

const storyController = {
  createStory: catchAsync(async (req, res) => {
    const file = req.file ||
      req.files?.media?.[0] ||
      req.files?.image?.[0] ||
      req.files?.video?.[0] ||
      null;
    const story = await storyService.createStory(req.body, req.user.userId, file);
    res.status(201).json(new ApiResponse(201, 'Story created', story));
  }),

  getActiveStories: catchAsync(async (req, res) => {
    const { stories, pagination } = await storyService.getActiveStories(req.query);
    const response = new ApiResponse(200, 'Stories retrieved', stories);
    response.pagination = pagination;
    res.json(response);
  }),

  markViewed: catchAsync(async (req, res) => {
    const story = await storyService.markViewed(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Story viewed', story));
  }),

  deleteStory: catchAsync(async (req, res) => {
    await storyService.deleteStory(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Story deleted'));
  })
};

export default storyController;
