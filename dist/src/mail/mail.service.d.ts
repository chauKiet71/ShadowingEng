import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly config;
    private readonly logger;
    private readonly transporter;
    private readonly from;
    private readonly isProduction;
    constructor(config: ConfigService);
    sendPasswordResetCode(email: string, code: string): Promise<void>;
}
