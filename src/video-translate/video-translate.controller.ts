import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { GuestIdentityService } from '../auth/guest-identity.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CreateVideoTranslateDto } from './dto/create-video-translate.dto';
import { VideoTranslateService } from './video-translate.service';

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
  async createJob(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-guest-token') guestToken: string | undefined,
    @Body() dto: CreateVideoTranslateDto,
  ) {
    const userId = await this.guestIdentity.resolveUserId(user, guestToken);
    return this.videoTranslateService.createJob(userId, dto.url);
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
