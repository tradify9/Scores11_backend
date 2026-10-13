// Accepts a bare 11-char id or any youtube.com / youtu.be URL form.
export const extractYoutubeVideoId = (value = '') => {
  const input = value.toString().trim();
  if (!input) return '';

  const plainId = /^[a-zA-Z0-9_-]{11}$/;
  if (plainId.test(input)) return input;

  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.split('/').filter(Boolean)[0] || '';
    }
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    const parts = url.pathname.split('/').filter(Boolean);
    const markers = ['embed', 'live', 'shorts'];
    for (const marker of markers) {
      const index = parts.indexOf(marker);
      if (index >= 0 && parts[index + 1]) return parts[index + 1];
    }
  } catch (_) {
    return '';
  }

  return '';
};

export default extractYoutubeVideoId;
