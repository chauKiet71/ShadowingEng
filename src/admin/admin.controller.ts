import { Controller, Get, Param, Patch, Query, Body, UseGuards } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOverviewService } from './admin-overview.service';
import { AdminPackagesService } from './admin-packages.service';
import {
  AdminStatsRange,
  AdminStatsService,
} from './admin-stats.service';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminUsersService } from './admin-users.service';
import { UpdateAdminUserPremiumDto } from './dto/update-admin-user-premium.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly overviewService: AdminOverviewService,
    private readonly transactionsService: AdminTransactionsService,
    private readonly statsService: AdminStatsService,
    private readonly packagesService: AdminPackagesService,
    private readonly usersService: AdminUsersService,
  ) {}

  @Get('overview')
  getOverview() {
    return this.overviewService.getOverview();
  }

  @Get('stats')
  getStats(
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const allowed: AdminStatsRange[] = ['7d', '30d', '90d', 'custom'];
    const parsed = allowed.includes(range as AdminStatsRange)
      ? (range as AdminStatsRange)
      : '30d';
    return this.statsService.getStats({
      range: parsed,
      from,
      to,
    });
  }

  @Get('packages/:id/subscribers')
  listPackageSubscribers(@Param('id') id: string) {
    return this.packagesService.listSubscribers(id);
  }

  @Patch('users/:id/premium')
  updateUserPremium(
    @Param('id') id: string,
    @Body() body: UpdateAdminUserPremiumDto,
  ) {
    return this.usersService.updatePremium(id, body);
  }

  @Get('transactions/stats')
  getTransactionStats() {
    return this.transactionsService.getStats();
  }

  @Get('transactions')
  listTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const allowed = Object.values(PaymentStatus);
    const parsedStatus =
      status && allowed.includes(status as PaymentStatus)
        ? (status as PaymentStatus)
        : undefined;

    return this.transactionsService.list({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      status: parsedStatus,
      search,
    });
  }
}
