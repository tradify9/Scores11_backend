import * as liveStreamService from './liveStream.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const createLiveStream = catchAsync(async (req, res) => {
  console.log(`[${new Date().toISOString()}] [LIVESTREAM-CONTROLLER] createLiveStream req.user._id: ${req.user._id} (${typeof req.user._id})`);
  console.log(`[${new Date().toISOString()}] [LIVESTREAM-CONTROLLER] req.user: ${JSON.stringify(req.user)}`);
  const stream = await liveStreamService.createLiveStream(req.user._id, req.body);
  ApiResponse.created(res, 'Live stream created successfully', stream);
});

export const getYoutubeAuthUrl = catchAsync(async (req, res) => {
  const data = await liveStreamService.getYoutubeAuthUrl(req.user._id);
  ApiResponse.success(res, 'YouTube authorization URL generated', data);
});

export const getYoutubeStatus = catchAsync(async (req, res) => {
  const data = await liveStreamService.getYoutubeConnectionStatus(req.user._id);
  ApiResponse.success(res, 'YouTube connection status fetched', data);
});

export const disconnectYoutube = catchAsync(async (req, res) => {
  const data = await liveStreamService.disconnectYoutube(req.user._id);
  ApiResponse.success(res, 'YouTube channel disconnected', data);
});

const escapeHtml = (value = '') => value.toString()
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const youtubeCallback = async (req, res) => {
  let data;
  try {
    data = await liveStreamService.handleYoutubeCallback(req.query);
  } catch (error) {
    // The user lands here in a browser, so answer with a page, not JSON.
    const reason = req.query.error || error.message || 'YouTube connection failed';
    return res.status(error.statusCode || 400).type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><title>YouTube not connected</title></head><body style="margin:0;font-family:Arial,sans-serif;background:#0f172a;color:#fff;display:grid;min-height:100vh;place-items:center;padding:24px"><div style="max-width:420px;background:#111827;border:1px solid #334155;border-radius:18px;padding:24px;text-align:center"><h1 style="margin:0 0 10px;font-size:24px">YouTube not connected</h1><p style="color:#cbd5e1;line-height:1.5">${escapeHtml(reason)}</p><p style="color:#cbd5e1">Return to the Scores11 app and try Connect again.</p></div></body></html>`);
  }
  res.type('html').send(`<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>YouTube Connected</title>
  <style>
    body{margin:0;font-family:Arial,sans-serif;background:#0f172a;color:#fff;display:grid;min-height:100vh;place-items:center;padding:24px}
    .card{max-width:420px;background:#111827;border:1px solid #334155;border-radius:18px;padding:24px;text-align:center}
    h1{margin:0 0 10px;font-size:24px}
    p{color:#cbd5e1;line-height:1.5}
  </style>
</head>
<body>
  <div class="card">
    <h1>YouTube connected</h1>
    <p>${escapeHtml(data.channelTitle)} is connected with Scores11. You can return to the app and create YouTube Live streams.</p>
  </div>
</body>
</html>`);
};

export const getLiveStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getLiveStreams(req.query);
  ApiResponse.success(res, 'Live streams fetched successfully', streams);
});

export const getLiveStreamById = catchAsync(async (req, res) => {
  const stream = await liveStreamService.getLiveStreamById(req.params.streamId);
  ApiResponse.success(res, 'Live stream fetched successfully', stream);
});

export const updateLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.updateLiveStream(
    req.params.streamId,
    req.user._id,
    req.body
  );
  ApiResponse.success(res, 'Live stream updated successfully', stream);
});

export const deleteLiveStream = catchAsync(async (req, res) => {
  await liveStreamService.deleteLiveStream(req.params.streamId, req.user._id);
  ApiResponse.success(res, 'Live stream deleted successfully', null);
});

export const startLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.startLiveStream(
    req.params.streamId,
    req.user._id
  );
  ApiResponse.success(res, 'Live stream started', stream);
});

export const endLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.endLiveStream(
    req.params.streamId,
    req.user._id
  );
  ApiResponse.success(res, 'Live stream ended', stream);
});

export const joinLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.joinLiveStream(
    req.params.streamId,
    req.user._id
  );
  ApiResponse.success(res, 'Joined live stream', stream);
});

export const leaveLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.leaveLiveStream(
    req.params.streamId,
    req.user._id
  );
  ApiResponse.success(res, 'Left live stream', stream);
});

export const sendChatMessage = catchAsync(async (req, res) => {
  const message = await liveStreamService.sendChatMessage(
    req.params.streamId,
    req.user._id,
    req.body.message
  );
  ApiResponse.success(res, 'Message sent', message);
});

export const likeLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.likeLiveStream(
    req.params.streamId,
    req.user._id
  );
  ApiResponse.success(res, 'Liked live stream', stream);
});

export const getFeaturedStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getFeaturedStreams(
    parseInt(req.query.limit) || 10
  );
  ApiResponse.success(res, 'Featured streams fetched successfully', streams);
});

export const getMyStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getMyStreams(
    req.user._id,
    parseInt(req.query.page) || 1,
    parseInt(req.query.limit) || 10
  );
  ApiResponse.success(res, 'My streams fetched successfully', streams);
});


