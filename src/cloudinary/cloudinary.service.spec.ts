import { ServiceUnavailableException } from '@nestjs/common';
import {
  v2 as cloudinary,
  type UploadApiResponse,
  type UploadStream,
} from 'cloudinary';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createService(config: Record<string, string | undefined> = {}) {
    return new CloudinaryService({
      get: jest.fn((key: string) => config[key]),
    } as never);
  }

  it('uploads and transforms an avatar with a stable public id', async () => {
    jest.spyOn(cloudinary, 'config').mockReturnValue({} as never);
    const end = jest.fn();
    const upload = jest
      .spyOn(cloudinary.uploader, 'upload_stream')
      .mockImplementation((options, callback) => {
        setImmediate(() => {
          callback?.(undefined, {
            secure_url:
              'https://res.cloudinary.com/demo/image/upload/avatar.webp',
          } as UploadApiResponse);
        });
        return { end } as unknown as UploadStream;
      });
    const service = createService({
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
    });
    const buffer = Buffer.from('image');

    const url = await service.uploadAvatar('user-123', buffer);

    expect(url).toBe(
      'https://res.cloudinary.com/demo/image/upload/avatar.webp',
    );
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'showding-eng/avatars',
        public_id: 'user-123',
        overwrite: true,
        invalidate: true,
        format: 'webp',
        transformation: [
          expect.objectContaining({ width: 512, height: 512, crop: 'fill' }),
        ],
      }),
      expect.any(Function),
    );
    expect(end).toHaveBeenCalledWith(buffer);
  });

  it('fails clearly when Cloudinary credentials are missing', async () => {
    const service = createService();

    await expect(
      service.uploadAvatar('user-123', Buffer.from('image')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects a sample CLOUDINARY_URL before attempting an upload', async () => {
    const upload = jest.spyOn(cloudinary.uploader, 'upload_stream');
    const service = createService({
      CLOUDINARY_URL: 'cloudinary://<api_key>:<api_secret>@<cloud_name>',
    });

    await expect(
      service.uploadAvatar('user-123', Buffer.from('image')),
    ).rejects.toThrow('CLOUDINARY_URL còn chứa giá trị mẫu');
    expect(upload).not.toHaveBeenCalled();
  });

  it('falls back to separate credentials when CLOUDINARY_URL is invalid', async () => {
    const config = jest
      .spyOn(cloudinary, 'config')
      .mockReturnValue({} as never);
    createService({
      CLOUDINARY_URL: 'cloudinary://<api_key>:<api_secret>@<cloud_name>',
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'real-key',
      CLOUDINARY_API_SECRET: 'real-secret',
    });

    expect(config).toHaveBeenCalledWith(
      expect.objectContaining({
        cloud_name: 'demo',
        api_key: 'real-key',
        api_secret: 'real-secret',
      }),
    );
  });

  it('explains when the API key cannot create assets', async () => {
    jest.spyOn(cloudinary, 'config').mockReturnValue({} as never);
    const end = jest.fn();
    jest
      .spyOn(cloudinary.uploader, 'upload_stream')
      .mockImplementation((_options, callback) => {
        setImmediate(() => {
          callback?.(
            {
              message: 'Server returned unexpected status code - 403',
              http_code: 403,
              name: 'Error',
            },
            undefined,
          );
        });
        return { end } as unknown as UploadStream;
      });
    const service = createService({
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'real-key',
      CLOUDINARY_API_SECRET: 'real-secret',
    });

    await expect(
      service.uploadAvatar('user-123', Buffer.from('image')),
    ).rejects.toThrow('không có quyền tải ảnh (create)');
  });
});
