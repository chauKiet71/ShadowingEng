import { ConfigService } from '@nestjs/config';
export declare class CloudinaryService {
    private readonly config;
    private readonly logger;
    private readonly configured;
    private readonly configurationError;
    constructor(config: ConfigService);
    uploadAvatar(userId: string, buffer: Buffer): Promise<string>;
    private resolveCredentials;
    private isPlaceholder;
    private getCloudinaryError;
}
