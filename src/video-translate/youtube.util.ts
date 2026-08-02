const YOUTUBE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function validVideoId(value: string | undefined | null) {
  return value && YOUTUBE_VIDEO_ID_RE.test(value) ? value : null;
}

export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (YOUTUBE_VIDEO_ID_RE.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (hostname === 'youtu.be') {
      return validVideoId(pathParts[0]);
    }

    const isYoutubeHost =
      hostname === 'youtube.com' || hostname.endsWith('.youtube.com');
    if (!isYoutubeHost) return null;

    const watchId = validVideoId(url.searchParams.get('v'));
    if (watchId) return watchId;

    if (['embed', 'shorts', 'live'].includes(pathParts[0])) {
      return validVideoId(pathParts[1]);
    }
  } catch {
    return null;
  }

  return null;
}

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
