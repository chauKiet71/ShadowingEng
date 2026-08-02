import { extractYoutubeVideoId } from './youtube.util';

describe('extractYoutubeVideoId', () => {
  const videoId = 'dQw4w9WgXcQ';

  it.each([
    videoId,
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://m.youtube.com/watch?v=${videoId}&feature=share`,
    `https://youtu.be/${videoId}?si=test`,
    `https://www.youtube.com/shorts/${videoId}`,
    `https://www.youtube.com/live/${videoId}?feature=share`,
    `https://www.youtube.com/embed/${videoId}`,
  ])('extracts the id from %s', (value) => {
    expect(extractYoutubeVideoId(value)).toBe(videoId);
  });

  it.each([
    '',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://notyoutube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=too-short',
  ])('rejects a non-YouTube value: %s', (value) => {
    expect(extractYoutubeVideoId(value)).toBeNull();
  });
});
