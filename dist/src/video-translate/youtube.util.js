"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractYoutubeVideoId = extractYoutubeVideoId;
exports.youtubeWatchUrl = youtubeWatchUrl;
exports.youtubeThumbnailUrl = youtubeThumbnailUrl;
const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
function extractYoutubeVideoId(input) {
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed))
        return trimmed;
    try {
        const url = new URL(trimmed);
        if (url.hostname.includes('youtu.be')) {
            const id = url.pathname.split('/').filter(Boolean)[0];
            return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
        }
        const v = url.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v))
            return v;
    }
    catch {
    }
    const match = trimmed.match(YOUTUBE_ID_RE);
    return match?.[1] ?? null;
}
function youtubeWatchUrl(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
}
function youtubeThumbnailUrl(videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
//# sourceMappingURL=youtube.util.js.map