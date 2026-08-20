import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import {
  LearnVocabularyWordDto,
  LookupVocabularyWordDto,
  ReviewVocabularyWordDto,
} from './dto/vocabulary.dto';
import { VocabularyService } from './vocabulary.service';

@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Get('overview')
  @UseGuards(OptionalJwtAuthGuard)
  getOverview(@CurrentUser() user: { id: string } | null) {
    return this.vocabularyService.getOverview(user?.id);
  }

  @Get('sessions/learn')
  @UseGuards(JwtAuthGuard)
  getLearnSession(
    @CurrentUser() user: { id: string },
    @Query('setId') setId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vocabularyService.getLearnSession(user.id, {
      setId: setId?.trim() || undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('sessions/review')
  @UseGuards(JwtAuthGuard)
  getReviewSession(
    @CurrentUser() user: { id: string },
    @Query('setId') setId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vocabularyService.getReviewSession(user.id, {
      setId: setId?.trim() || undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('sets')
  @UseGuards(OptionalJwtAuthGuard)
  getSets(@CurrentUser() user: { id: string } | null) {
    return this.vocabularyService.getSets(user?.id);
  }

  @Get('sets/:id')
  @UseGuards(OptionalJwtAuthGuard)
  getSet(@CurrentUser() user: { id: string } | null, @Param('id') id: string) {
    return this.vocabularyService.getSet(user?.id, id);
  }

  @Post('sets/:id/save')
  @UseGuards(JwtAuthGuard)
  saveSet(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.vocabularyService.saveSet(user.id, id);
  }

  @Delete('sets/:id/save')
  @UseGuards(JwtAuthGuard)
  removeSet(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.vocabularyService.removeSet(user.id, id);
  }

  @Post('words/learn')
  @UseGuards(JwtAuthGuard)
  learnWord(
    @CurrentUser() user: { id: string },
    @Body() dto: LearnVocabularyWordDto,
  ) {
    return this.vocabularyService.learnWord(
      user.id,
      dto.wordId,
      dto.correct ?? true,
    );
  }

  @Post('words/lookup')
  @UseGuards(OptionalJwtAuthGuard)
  lookupWord(
    @CurrentUser() user: { id: string } | null,
    @Body() dto: LookupVocabularyWordDto,
  ) {
    return this.vocabularyService.lookupWord(user?.id, dto);
  }

  @Post('words/:id/review')
  @UseGuards(JwtAuthGuard)
  reviewWord(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: ReviewVocabularyWordDto,
  ) {
    return this.vocabularyService.reviewWord(user.id, id, dto.correct);
  }
}
