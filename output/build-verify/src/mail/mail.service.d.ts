import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private config;
    private readonly logger;
    private transporter;
    constructor(config: ConfigService);
    sendPasswordResetCode(email: string, code: string): Promise<void>;
}
