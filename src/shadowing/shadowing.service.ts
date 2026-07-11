import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';
import { scoreTranscript, type ScoredWord } from './word-scorer';

export interface ShadowingResult {
  transcript: string;
  words: ScoredWord[];
  score: number;
}

@Injectable()
export class ShadowingService {
  private readonly logger = new Logger(ShadowingService.name);
  private openai: OpenAI | null = null;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY chưa cấu hình — tính năng Shadowing STT sẽ không hoạt động');
    }
  }

  isConfigured() {
    return !!this.openai;
  }

  async scoreRecording(
    audioBase64: string,
    expectedText: string,
  ): Promise<ShadowingResult> {
    if (!this.openai) {
      throw new Error('OPENAI_API_KEY chưa được cấu hình trên server');
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    if (buffer.length === 0) {
      throw new Error('Không nhận được dữ liệu ghi âm');
    }

    const file = await toFile(buffer, 'recording.webm', { type: 'audio/webm' });
    const transcription = await this.openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
    });

    const transcript = transcription.text.trim();
    const words = scoreTranscript(expectedText, transcript);
    const correctCount = words.filter((w) => w.correct).length;
    const score =
      words.length > 0 ? Math.round((correctCount / words.length) * 100) : 0;

    return { transcript, words, score };
  }
}
