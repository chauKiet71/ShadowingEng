import { Module } from '@nestjs/common';
import { ShadowingGateway } from './shadowing.gateway';
import { ShadowingService } from './shadowing.service';

@Module({
  providers: [ShadowingGateway, ShadowingService],
})
export class ShadowingModule {}
