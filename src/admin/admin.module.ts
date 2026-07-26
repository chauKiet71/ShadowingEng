import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminOverviewService } from './admin-overview.service';
import { AdminPackagesService } from './admin-packages.service';
import { AdminStatsService } from './admin-stats.service';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [
    AdminOverviewService,
    AdminTransactionsService,
    AdminStatsService,
    AdminPackagesService,
    AdminUsersService,
  ],
})
export class AdminModule {}
