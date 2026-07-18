import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateVideoTranslateDto } from './dto/create-video-translate.dto';
import { VideoTranslateService } from './video-translate.service';

@Controller('video-translate')
@UseGuards(JwtAuthGuard)
export class VideoTranslateController {
  constructor(private readonly videoTranslateService: VideoTranslateService) {}

  @Get('quota')
  getQuota(@CurrentUser() user: { id: string }) {
    return this.videoTranslateService.getQuota(user.id);
  }

  @Get('jobs')
  listJobs(@CurrentUser() user: { id: string }) {
    return this.videoTranslateService.listJobs(user.id);
  }

  @Get('jobs/:id')
  getJob(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.videoTranslateService.getJob(user.id, id);
  }

  @Post('jobs')
  createJob(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateVideoTranslateDto,
  ) {
    return this.videoTranslateService.createJob(user.id, dto.url);
  }

  @Delete('jobs/:id')
  deleteJob(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.videoTranslateService.deleteJob(user.id, id);
  }
}
