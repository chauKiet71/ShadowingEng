import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('stats')
  getStats() {
    return this.usersService.getStats();
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: UserStatus,
    @Query('isPremium') isPremium?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
      status,
      isPremium: isPremium === 'true' ? true : isPremium === 'false' ? false : undefined,
      search,
    });
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }
}
