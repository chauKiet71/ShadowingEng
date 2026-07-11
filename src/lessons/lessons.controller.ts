import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { LessonsService } from './lessons.service';

@Controller('lessons')
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

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
