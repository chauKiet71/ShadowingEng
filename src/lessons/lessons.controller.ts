import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { LessonsService } from './lessons.service';
import { LessonAccessService } from './lesson-access.service';
import { UpdateLessonAccessDto } from './dto/update-lesson-access.dto';

@Controller('lessons')
export class LessonsController {
  constructor(
    private lessonsService: LessonsService,
    private lessonAccessService: LessonAccessService,
  ) {}

  @Get('access')
  getAccessMap() {
    return this.lessonAccessService.getAccessMap();
  }

  @Put('access/:lessonId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  setAccess(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonAccessDto,
  ) {
    return this.lessonAccessService.setLocked(lessonId, dto.isLocked);
  }

  @Get()
  findAll(
    @Query('featured') featured?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.lessonsService.findAll({
      featured: featured === 'true',
      categoryId,
    });
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  getMyStats(@CurrentUser() user: { id: string }) {
    return this.lessonsService.getHistoryStats(user.id);
  }

  @Get('me/history')
  @UseGuards(JwtAuthGuard)
  getMyHistory(@CurrentUser() user: { id: string }) {
    return this.lessonsService.getMyHistoryEntries(user.id);
  }

  @Put('me/history')
  @UseGuards(JwtAuthGuard)
  upsertMyHistory(
    @CurrentUser() user: { id: string },
    @Body()
    dto: {
      lessonId: string;
      status?: string;
      progress?: number;
      listenedSeconds?: number;
      isFavorite?: boolean;
    },
  ) {
    return this.lessonsService.upsertHistory(user.id, dto);
  }

  @Get('me/favorites')
  @UseGuards(JwtAuthGuard)
  getMyFavorites(@CurrentUser() user: { id: string }) {
    return this.lessonsService.getMyFavoriteIds(user.id);
  }

  @Put('me/favorites/:lessonId')
  @UseGuards(JwtAuthGuard)
  saveFavorite(
    @CurrentUser() user: { id: string },
    @Param('lessonId') lessonId: string,
  ) {
    return this.lessonsService.setFavorite(user.id, lessonId, true);
  }

  @Delete('me/favorites/:lessonId')
  @UseGuards(JwtAuthGuard)
  removeFavorite(
    @CurrentUser() user: { id: string },
    @Param('lessonId') lessonId: string,
  ) {
    return this.lessonsService.setFavorite(user.id, lessonId, false);
  }

  @Get('history/:userId')
  getHistory(
    @Param('userId') userId: string,
    @Query('status') status?: string,
  ) {
    return this.lessonsService.getHistory(userId, status);
  }

  @Get('history/:userId/stats')
  getHistoryStats(@Param('userId') userId: string) {
    return this.lessonsService.getHistoryStats(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(id);
  }
}
