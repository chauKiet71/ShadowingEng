"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CloudinaryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
let CloudinaryService = CloudinaryService_1 = class CloudinaryService {
    config;
    logger = new common_1.Logger(CloudinaryService_1.name);
    configured;
    configurationError;
    constructor(config) {
        this.config = config;
        const { credentials, error } = this.resolveCredentials();
        this.configured = credentials != null;
        this.configurationError = error;
        if (!credentials) {
            this.logger.warn(error ?? 'Cloudinary chưa được cấu hình');
            return;
        }
        cloudinary_1.v2.config({
            cloud_name: credentials.cloudName,
            api_key: credentials.apiKey,
            api_secret: credentials.apiSecret,
            secure: true,
        });
    }
    async uploadAvatar(userId, buffer) {
        if (!this.configured) {
            throw new common_1.ServiceUnavailableException(this.configurationError ??
                'Cloudinary chưa được cấu hình. Hãy thêm CLOUDINARY_URL vào file .env.');
        }
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary_1.v2.uploader.upload_stream({
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
            }, (error, uploaded) => {
                if (error || !uploaded) {
                    reject(error ?? new Error('Cloudinary không trả về kết quả'));
                    return;
                }
                resolve(uploaded);
            });
            stream.end(buffer);
        }).catch((error) => {
            const details = this.getCloudinaryError(error);
            this.logger.error(`Cloudinary avatar upload failed (${details.httpCode ?? 'unknown'}): ${details.message}`);
            if (details.httpCode === 401 ||
                /unknown api_key|invalid signature/i.test(details.message)) {
                throw new common_1.ServiceUnavailableException('Cloudinary từ chối thông tin đăng nhập. Hãy thay CLOUDINARY_URL mẫu bằng URL thật trong Cloudinary Console rồi khởi động lại server.');
            }
            if (details.httpCode === 403) {
                throw new common_1.ServiceUnavailableException('API key Cloudinary không có quyền tải ảnh (create). Hãy cấp quyền Upload/Create cho API key hoặc tạo API key mới có quyền ghi.');
            }
            throw new common_1.ServiceUnavailableException('Không thể tải ảnh lên Cloudinary. Vui lòng thử lại.');
        });
        if (!result.secure_url) {
            throw new common_1.ServiceUnavailableException('Cloudinary không trả về đường dẫn ảnh hợp lệ.');
        }
        return result.secure_url;
    }
    resolveCredentials() {
        const cloudinaryUrl = this.config.get('CLOUDINARY_URL')?.trim();
        let urlError = null;
        if (cloudinaryUrl) {
            if (this.isPlaceholder(cloudinaryUrl)) {
                urlError =
                    'CLOUDINARY_URL còn chứa giá trị mẫu. Hãy sao chép URL thật từ Cloudinary Console.';
            }
            else {
                try {
                    const parsed = new URL(cloudinaryUrl);
                    if (parsed.protocol !== 'cloudinary:') {
                        urlError = 'CLOUDINARY_URL phải bắt đầu bằng cloudinary://';
                    }
                    const cloudName = parsed.hostname.trim();
                    const apiKey = decodeURIComponent(parsed.username).trim();
                    const apiSecret = decodeURIComponent(parsed.password).trim();
                    if (parsed.protocol === 'cloudinary:' &&
                        cloudName &&
                        apiKey &&
                        apiSecret &&
                        ![cloudName, apiKey, apiSecret].some((value) => this.isPlaceholder(value))) {
                        return {
                            credentials: { cloudName, apiKey, apiSecret },
                            error: null,
                        };
                    }
                    urlError ??=
                        'CLOUDINARY_URL còn chứa giá trị mẫu. Hãy sao chép URL thật từ Cloudinary Console.';
                }
                catch (error) {
                    urlError = `CLOUDINARY_URL không hợp lệ: ${error instanceof Error ? error.message : String(error)}`;
                }
            }
        }
        const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME')?.trim();
        const apiKey = this.config.get('CLOUDINARY_API_KEY')?.trim();
        const apiSecret = this.config.get('CLOUDINARY_API_SECRET')?.trim();
        if (cloudName &&
            apiKey &&
            apiSecret &&
            ![cloudName, apiKey, apiSecret].some((value) => this.isPlaceholder(value))) {
            return {
                credentials: { cloudName, apiKey, apiSecret },
                error: null,
            };
        }
        return {
            credentials: null,
            error: urlError ??
                'Cloudinary chưa được cấu hình. Hãy thêm CLOUDINARY_URL thật vào file .env.',
        };
    }
    isPlaceholder(value) {
        const normalized = value.trim().replace(/[<>]/g, '').toLowerCase();
        return (value.includes('<') ||
            value.includes('>') ||
            normalized.startsWith('your-') ||
            normalized.startsWith('your_') ||
            ['api_key', 'api_secret', 'cloud_name'].includes(normalized));
    }
    getCloudinaryError(error) {
        if (error instanceof Error) {
            return { message: error.message };
        }
        if (error && typeof error === 'object') {
            const value = error;
            const message = value.message ?? value.error?.message;
            const httpCode = value.http_code ?? value.error?.http_code;
            return {
                message: typeof message === 'string' ? message : 'Unknown Cloudinary error',
                httpCode: typeof httpCode === 'number' ? httpCode : undefined,
            };
        }
        return { message: String(error) };
    }
};
exports.CloudinaryService = CloudinaryService;
exports.CloudinaryService = CloudinaryService = CloudinaryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryService);
//# sourceMappingURL=cloudinary.service.js.map