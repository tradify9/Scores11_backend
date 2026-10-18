import LiveStream from '../modules/liveStream/liveStream.model.js';
import { finishLiveStream, syncAppBroadcasts } from '../modules/liveStream/liveStream.service.js';
import { fetchYoutubeVideoStatuses, isYoutubeApiKeyConfigured } from '../utils/youtubeApi.js';

const CHECK_INTERVAL_MS = 2 * 60 * 1000;
// YouTube caps a single broadcast at 12 hours; anything "live" longer than
// that in our database is a stream whose host never pressed End.
const MAX_LIVE_MS = 12 * 60 * 60 * 1000;
// A brand-new broadcast can take a little while to show up in the Data API.
const NOT_FOUND_GRACE_MS = 15 * 60 * 1000;

/**
 * Keeps YouTube streams in step with YouTube itself, so a host who forgets to
 * press "End stream" does not leave a permanent WATCH LIVE banner:
 *  - broadcast finished on YouTube  -> end it here and publish the replay
 *  - video deleted / made private   -> end it here (no replay to show)
 *  - still live                     -> refresh viewer count and thumbnail
 * Needs YOUTUBE_API_KEY; without it only the 12-hour safety net applies.
 */
export const syncYoutubeStreams = async () => {
  // Phone broadcasts: batched status per channel, silence and stale cleanup.
  let appEnded = 0;
  try {
    appEnded = await syncAppBroadcasts();
  } catch (error) {
    console.warn('[YOUTUBE] App broadcast sync skipped:', error.message);
  }
  if (appEnded) console.log(`YouTube stream sync: ended ${appEnded} phone broadcast(s)`);

  const streams = await LiveStream.find({
    status: 'live',
    youtubeVideoId: { $exists: true, $nin: [null, ''] }
  }).limit(200);
  if (!streams.length) return { checked: 0, ended: 0 };

  let ended = 0;
  const now = Date.now();
  const statuses = isYoutubeApiKeyConfigured()
    ? await fetchYoutubeVideoStatuses(streams.map((s) => s.youtubeVideoId).slice(0, 50))
    : null;

  const lookedUp = new Set(streams.slice(0, 50).map((s) => s.youtubeVideoId));

  for (const stream of streams) {
    const startedAt = stream.startedAt || stream.createdAt;
    const ageMs = now - new Date(startedAt).getTime();
    const video = statuses?.get(stream.youtubeVideoId);
    // Broadcasts the app created through the host's own channel may be
    // private, which an API key cannot see - that is not "deleted".
    const createdByApp = Boolean(stream.youtubeBroadcastId);

    if (statuses && !video && lookedUp.has(stream.youtubeVideoId) && !createdByApp) {
      // A pasted link YouTube no longer returns: deleted or made private.
      if (ageMs > NOT_FOUND_GRACE_MS) {
        stream.youtubeVideoId = undefined; // nothing watchable to publish as a replay
        await finishLiveStream(stream);
        ended += 1;
      }
      continue;
    }

    if (video?.hasEnded) {
      await finishLiveStream(stream, video.actualEndTime || new Date());
      ended += 1;
      continue;
    }

    if (ageMs > MAX_LIVE_MS) {
      await finishLiveStream(stream);
      ended += 1;
      continue;
    }

    if (video?.isLiveNow) {
      let changed = false;
      if (video.thumbnail && stream.thumbnail !== video.thumbnail) {
        stream.thumbnail = video.thumbnail;
        changed = true;
      }
      if (changed) await stream.save();
    }
  }

  if (ended) console.log(`YouTube stream sync: ended ${ended} finished stream(s)`);
  return { checked: streams.length, ended };
};

export const scheduleSyncYoutubeStreams = () => {
  const run = () => syncYoutubeStreams().catch((error) =>
    console.error('YouTube stream sync failed:', error.response?.data?.error?.message || error.message));
  run();
  setInterval(run, CHECK_INTERVAL_MS);
};

export default scheduleSyncYoutubeStreams;
