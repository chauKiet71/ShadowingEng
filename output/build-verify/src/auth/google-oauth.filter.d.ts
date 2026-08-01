import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
export declare class GoogleOAuthExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void;
}
