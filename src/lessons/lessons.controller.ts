import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
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
