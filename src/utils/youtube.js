// Accepts a bare 11-char id or any youtube.com / youtu.be URL form
// (watch, live, shorts, embed, youtu.be and YouTube Studio links, with or
// without "https://").
const PLAIN_ID = /^[a-zA-Z0-9_-]{11}$/;

export const extractYoutubeVideoId = (value = '') => {
  const input = value.toString().trim();
  if (!input) return '';
  if (PLAIN_ID.test(input)) return input;

  let url;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(input) ? input : `https://${input}`);
  } catch (_) {
    return '';
  }
  if (!/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i.test(url.hostname)) return '';

  let candidate = '';
  if (/(^|\.)youtu\.be$/i.test(url.hostname)) {
    candidate = url.pathname.split('/').filter(Boolean)[0] || '';
  } else if (url.searchParams.get('v')) {
    candidate = url.searchParams.get('v');
  } else {
    const parts = url.pathname.split('/').filter(Boolean);
    // "video" covers studio.youtube.com/video/ID/livestreaming
    for (const marker of ['embed', 'live', 'shorts', 'video']) {
      const index = parts.indexOf(marker);
      if (index >= 0 && parts[index + 1]) {
        candidate = parts[index + 1];
        break;
      }
    }
  }
  return PLAIN_ID.test(candidate) ? candidate : '';
};

export default extractYoutubeVideoId;
