import {
  BadRequestException,
  Body,
  Controller,
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
import { CreateSpeakingSessionDto } from './dto/create-speaking-session.dto';
import { TranslateSpeakingDto } from './dto/translate-speaking.dto';
import { MAX_SPEAKING_AUDIO_BYTES, SpeakingService } from './speaking.service';

type UploadedAudio = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Controller('speaking')
@UseGuards(OptionalJwtAuthGuard)
export class SpeakingController {
  constructor(
    private readonly speakingService: SpeakingService,
    private readonly guestIdentity: GuestIdentityService,
  ) {}

  @Get('scenarios')
  listScenarios() {
    return this.speakingService.listScenarios();
  }

  @Get('quota')
  async getQuota(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    const userId = await this.guestIdentity.resolveUserId(user, guestToken);
    return this.speakingService.getQuota(userId);
  }

  @Post('sessions')
  async createSession(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-guest-token') guestToken: string | undefined,
    @Body() dto: CreateSpeakingSessionDto,
  ) {
    const userId = await this.guestIdentity.resolveUserId(user, guestToken);
    return this.speakingService.createSession(
      userId,
      dto.scenarioId,
      dto.level,
      dto.dialect,
    );
  }

  @Post('translate')
  translate(@Body() dto: TranslateSpeakingDto) {
    return this.speakingService.translateToVietnamese(dto.text);
  }

  @Get('sessions/:id')
  async getSession(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-guest-token') guestToken: string | undefined,
    @Param('id') id: string,
  ) {
    const userId = await this.guestIdentity.resolveUserId(user, guestToken);
    return this.speakingService.getSession(userId, id);
  }

  @Post('sessions/:id/turns')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: MAX_SPEAKING_AUDIO_BYTES },
    }),
  )
  async submitTurn(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-guest-token') guestToken: string | undefined,
    @Param('id') id: string,
    @UploadedFile() file: UploadedAudio,
    @Body('durationMs') durationMsRaw?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng gửi bản ghi âm');
    }

    const durationMs =
      durationMsRaw != null && durationMsRaw !== ''
        ? Number(durationMsRaw)
        : undefined;

    const userId = await this.guestIdentity.resolveUserId(user, guestToken);
    return this.speakingService.submitTurn(
      userId,
      id,
      file,
      Number.isFinite(durationMs) ? durationMs : undefined,
    );
  }

  @Post('sessions/:id/complete')
  async completeSession(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-guest-token') guestToken: string | undefined,
    @Param('id') id: string,
  ) {
    const userId = await this.guestIdentity.resolveUserId(user, guestToken);
    return this.speakingService.completeSession(userId, id);
  }
}
