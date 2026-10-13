// Public YouTube Data API lookups (API key only, no user OAuth).
import axios from 'axios';
import config from '../config/env.js';

export const isYoutubeApiKeyConfigured = () => Boolean(config.youtube.apiKey);

/**
 * Status of up to 50 videos in one call (1 quota unit).
 * Returns a Map keyed by video id; ids YouTube does not return (deleted or
 * private) are simply absent. Returns null when no API key is configured, so
 * callers can skip checks instead of failing.
 */
export const fetchYoutubeVideoStatuses = async (videoIds = []) => {
  if (!isYoutubeApiKeyConfigured()) return null;
  const ids = [...new Set(videoIds.filter(Boolean))].slice(0, 50);
  const statuses = new Map();
  if (!ids.length) return statuses;

  const { data } = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    timeout: 15000,
    params: {
      key: config.youtube.apiKey,
      id: ids.join(','),
      part: 'snippet,status,liveStreamingDetails'
    }
  });

  for (const item of data?.items || []) {
    const live = item.liveStreamingDetails || {};
    const thumbs = item.snippet?.thumbnails || {};
    statuses.set(item.id, {
      id: item.id,
      title: item.snippet?.title || '',
      thumbnail: (thumbs.high || thumbs.medium || thumbs.default || {}).url || '',
      privacyStatus: item.status?.privacyStatus || '',
      embeddable: item.status?.embeddable !== false,
      // none | upcoming | live  (a finished broadcast reports "none")
      liveBroadcastContent: item.snippet?.liveBroadcastContent || 'none',
      isLiveBroadcast: Boolean(item.liveStreamingDetails),
      isLiveNow: item.snippet?.liveBroadcastContent === 'live',
      isUpcoming: item.snippet?.liveBroadcastContent === 'upcoming',
      hasEnded: Boolean(live.actualEndTime),
      actualStartTime: live.actualStartTime ? new Date(live.actualStartTime) : null,
      actualEndTime: live.actualEndTime ? new Date(live.actualEndTime) : null,
      concurrentViewers: live.concurrentViewers ? Number(live.concurrentViewers) : 0
    });
  }
  return statuses;
};

export const fetchYoutubeVideoStatus = async (videoId) => {
  const statuses = await fetchYoutubeVideoStatuses([videoId]);
  if (statuses === null) return null;
  return statuses.get(videoId) || { id: videoId, notFound: true };
};

export default fetchYoutubeVideoStatuses;
