import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { GuestIdentityService } from '../auth/guest-identity.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { VideoTranslateService } from './video-translate.service';

const MAX_UPLOAD_BYTES = 120 * 1024 * 1024;

interface UploadedMediaFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Controller('video-translate')
@UseGuards(OptionalJwtAuthGuard)
export class VideoTranslateController {
  constructor(
    private readonly videoTranslateService: VideoTranslateService,
    private readonly guestIdentity: GuestIdentityService,
  ) {}

  @Get('quota')
  async getQuota(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    const userId = await this.guestIdentity.resolveUserId(user, guestToken);
    return this.videoTranslateService.getQuota(userId);
  }

  @Get('jobs')
  async listJobs(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    const userId = await this.guestIdentity.resolveUserId(user, guestToken);
    return this.videoTranslateService.listJobs(userId);
  }

  @Get('jobs/:id')
  async getJob(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-guest-token') guestToken: string | undefined,
    @Param('id') id: string,
  ) {
    const userId = await this.guestIdentity.resolveUserId(user, guestToken);
    return this.videoTranslateService.getJob(userId, id);
  }

  @Post('jobs')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async createJob(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-guest-token') guestToken: string | undefined,
    @UploadedFile() file?: UploadedMediaFile,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Hãy chọn file video hoặc audio để dịch');
    }
    const userId = await this.guestIdentity.resolveUserId(user, guestToken);
    return this.videoTranslateService.createJobFromUpload(userId, file);
  }

  @Delete('jobs/:id')
  async deleteJob(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-guest-token') guestToken: string | undefined,
    @Param('id') id: string,
  ) {
    const userId = await this.guestIdentity.resolveUserId(user, guestToken);
    return this.videoTranslateService.deleteJob(userId, id);
  }
}
