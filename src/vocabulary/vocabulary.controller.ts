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
import {
  LearnVocabularyWordDto,
  ReviewVocabularyWordDto,
} from './dto/vocabulary.dto';
import { VocabularyService } from './vocabulary.service';

@Controller('vocabulary')
@UseGuards(JwtAuthGuard)
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Get('overview')
  getOverview(@CurrentUser() user: { id: string }) {
    return this.vocabularyService.getOverview(user.id);
  }

  @Get('sets')
  getSets(@CurrentUser() user: { id: string }) {
    return this.vocabularyService.getSets(user.id);
  }

  @Get('sets/:id')
  getSet(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.vocabularyService.getSet(user.id, id);
  }

  @Post('sets/:id/save')
  saveSet(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.vocabularyService.saveSet(user.id, id);
  }

  @Delete('sets/:id/save')
  removeSet(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.vocabularyService.removeSet(user.id, id);
  }

  @Post('words/learn')
  learnWord(
    @CurrentUser() user: { id: string },
    @Body() dto: LearnVocabularyWordDto,
  ) {
    return this.vocabularyService.learnWord(user.id, dto.wordId);
  }

  @Post('words/:id/review')
  reviewWord(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: ReviewVocabularyWordDto,
  ) {
    return this.vocabularyService.reviewWord(user.id, id, dto.correct);
  }
}
