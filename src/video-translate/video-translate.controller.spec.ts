import { BadRequestException } from '@nestjs/common';
import { VideoTranslateController } from './video-translate.controller';

describe('VideoTranslateController createJob', () => {
  const createJob = jest.fn();
  const createJobFromUpload = jest.fn();
  const resolveUserId = jest.fn().mockResolvedValue('user-1');
  const controller = new VideoTranslateController(
    { createJob, createJobFromUpload } as never,
    { resolveUserId } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a job from a YouTube URL', async () => {
    createJob.mockResolvedValue({ job: { id: 'job-url' } });

    await expect(
      controller.createJob(
        null,
        'guest-token',
        { url: 'https://youtu.be/dQw4w9WgXcQ' },
        undefined,
      ),
    ).resolves.toEqual({ job: { id: 'job-url' } });

    expect(createJob).toHaveBeenCalledWith(
      'user-1',
      'https://youtu.be/dQw4w9WgXcQ',
    );
    expect(createJobFromUpload).not.toHaveBeenCalled();
  });

  it('keeps multipart uploads working', async () => {
    const file = {
      buffer: Buffer.from('media'),
      originalname: 'sample.mp4',
      mimetype: 'video/mp4',
      size: 5,
    };
    createJobFromUpload.mockResolvedValue({ job: { id: 'job-upload' } });

    await controller.createJob(null, 'guest-token', {}, file);

    expect(createJobFromUpload).toHaveBeenCalledWith('user-1', file);
    expect(createJob).not.toHaveBeenCalled();
  });

  it('requires either a URL or a file', async () => {
    await expect(
      controller.createJob(null, 'guest-token', {}, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
