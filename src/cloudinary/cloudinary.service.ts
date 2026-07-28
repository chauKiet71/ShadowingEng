import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  type UploadApiErrorResponse,
  type UploadApiResponse,
} from 'cloudinary';

type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

type ResolvedCloudinaryConfig = {
  credentials: CloudinaryCredentials | null;
  error: string | null;
};

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly configured: boolean;
  private readonly configurationError: string | null;

  constructor(private readonly config: ConfigService) {
    const { credentials, error } = this.resolveCredentials();
    this.configured = credentials != null;
    this.configurationError = error;

    if (!credentials) {
      this.logger.warn(error ?? 'Cloudinary chưa được cấu hình');
      return;
    }

    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
  }

  async uploadAvatar(userId: string, buffer: Buffer): Promise<string> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        this.configurationError ??
          'Cloudinary chưa được cấu hình. Hãy thêm CLOUDINARY_URL vào file .env.',
      );
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'showding-eng/avatars',
          public_id: userId,
          overwrite: true,
          invalidate: true,
          unique_filename: false,
          use_filename: false,
          format: 'webp',
          transformation: [
            {
              width: 512,
              height: 512,
              crop: 'fill',
              gravity: 'auto',
              quality: 'auto:good',
            },
          ],
        },
        (error?: UploadApiErrorResponse, uploaded?: UploadApiResponse) => {
          if (error || !uploaded) {
            reject(error ?? new Error('Cloudinary không trả về kết quả'));
            return;
          }
          resolve(uploaded);
        },
      );
      stream.end(buffer);
    }).catch((error: unknown) => {
      const details = this.getCloudinaryError(error);
      this.logger.error(
        `Cloudinary avatar upload failed (${details.httpCode ?? 'unknown'}): ${details.message}`,
      );

      if (
        details.httpCode === 401 ||
        /unknown api_key|invalid signature/i.test(details.message)
      ) {
        throw new ServiceUnavailableException(
          'Cloudinary từ chối thông tin đăng nhập. Hãy thay CLOUDINARY_URL mẫu bằng URL thật trong Cloudinary Console rồi khởi động lại server.',
        );
      }

      if (details.httpCode === 403) {
        throw new ServiceUnavailableException(
          'API key Cloudinary không có quyền tải ảnh (create). Hãy cấp quyền Upload/Create cho API key hoặc tạo API key mới có quyền ghi.',
        );
      }

      throw new ServiceUnavailableException(
        'Không thể tải ảnh lên Cloudinary. Vui lòng thử lại.',
      );
    });

    if (!result.secure_url) {
      throw new ServiceUnavailableException(
        'Cloudinary không trả về đường dẫn ảnh hợp lệ.',
      );
    }
    return result.secure_url;
  }

  private resolveCredentials(): ResolvedCloudinaryConfig {
    const cloudinaryUrl = this.config.get<string>('CLOUDINARY_URL')?.trim();
    let urlError: string | null = null;

    if (cloudinaryUrl) {
      if (this.isPlaceholder(cloudinaryUrl)) {
        urlError =
          'CLOUDINARY_URL còn chứa giá trị mẫu. Hãy sao chép URL thật từ Cloudinary Console.';
      } else {
        try {
          const parsed = new URL(cloudinaryUrl);
          if (parsed.protocol !== 'cloudinary:') {
            urlError = 'CLOUDINARY_URL phải bắt đầu bằng cloudinary://';
          }
          const cloudName = parsed.hostname.trim();
          const apiKey = decodeURIComponent(parsed.username).trim();
          const apiSecret = decodeURIComponent(parsed.password).trim();
          if (
            parsed.protocol === 'cloudinary:' &&
            cloudName &&
            apiKey &&
            apiSecret &&
            ![cloudName, apiKey, apiSecret].some((value) =>
              this.isPlaceholder(value),
            )
          ) {
            return {
              credentials: { cloudName, apiKey, apiSecret },
              error: null,
            };
          }
          urlError ??=
            'CLOUDINARY_URL còn chứa giá trị mẫu. Hãy sao chép URL thật từ Cloudinary Console.';
        } catch (error) {
          urlError = `CLOUDINARY_URL không hợp lệ: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      }
    }

    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET')?.trim();
    if (
      cloudName &&
      apiKey &&
      apiSecret &&
      ![cloudName, apiKey, apiSecret].some((value) => this.isPlaceholder(value))
    ) {
      return {
        credentials: { cloudName, apiKey, apiSecret },
        error: null,
      };
    }

    return {
      credentials: null,
      error:
        urlError ??
        'Cloudinary chưa được cấu hình. Hãy thêm CLOUDINARY_URL thật vào file .env.',
    };
  }

  private isPlaceholder(value: string): boolean {
    const normalized = value.trim().replace(/[<>]/g, '').toLowerCase();
    return (
      value.includes('<') ||
      value.includes('>') ||
      normalized.startsWith('your-') ||
      normalized.startsWith('your_') ||
      ['api_key', 'api_secret', 'cloud_name'].includes(normalized)
    );
  }

  private getCloudinaryError(error: unknown): {
    message: string;
    httpCode?: number;
  } {
    if (error instanceof Error) {
      return { message: error.message };
    }

    if (error && typeof error === 'object') {
      const value = error as {
        message?: unknown;
        http_code?: unknown;
        error?: { message?: unknown; http_code?: unknown };
      };
      const message = value.message ?? value.error?.message;
      const httpCode = value.http_code ?? value.error?.http_code;
      return {
        message:
          typeof message === 'string' ? message : 'Unknown Cloudinary error',
        httpCode: typeof httpCode === 'number' ? httpCode : undefined,
      };
    }

    return { message: String(error) };
  }
}
