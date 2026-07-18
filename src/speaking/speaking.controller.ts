import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSpeakingSessionDto } from './dto/create-speaking-session.dto';
import { TranslateSpeakingDto } from './dto/translate-speaking.dto';
import {
  MAX_SPEAKING_AUDIO_BYTES,
  SpeakingService,
} from './speaking.service';

type UploadedAudio = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Controller('speaking')
@UseGuards(JwtAuthGuard)
export class SpeakingController {
  constructor(private readonly speakingService: SpeakingService) {}

  @Get('scenarios')
  listScenarios() {
    return this.speakingService.listScenarios();
  }

  @Get('quota')
  getQuota(@CurrentUser() user: { id: string }) {
    return this.speakingService.getQuota(user.id);
  }

  @Post('sessions')
  createSession(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSpeakingSessionDto,
  ) {
    return this.speakingService.createSession(
      user.id,
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
  getSession(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.speakingService.getSession(user.id, id);
  }

  @Post('sessions/:id/turns')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: MAX_SPEAKING_AUDIO_BYTES },
    }),
  )
  submitTurn(
    @CurrentUser() user: { id: string },
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

    return this.speakingService.submitTurn(
      user.id,
      id,
      file,
      Number.isFinite(durationMs) ? durationMs : undefined,
    );
  }

  @Post('sessions/:id/complete')
  completeSession(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.speakingService.completeSession(user.id, id);
  }
}
