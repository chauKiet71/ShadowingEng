import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PackageStatus } from '@prisma/client';
import { PackagesService } from './packages.service';
import type { PackagePayload } from './packages.service';

@Controller('packages')
export class PackagesController {
  constructor(private packagesService: PackagesService) {}

  @Get()
  findAll(
    @Query('status') status?: PackageStatus,
    @Query('visible') visible?: string,
  ) {
    return this.packagesService.findAll({
      status,
      visible: visible === 'true' ? true : visible === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.packagesService.findOne(id);
  }

  @Post()
  create(@Body() body: PackagePayload) {
    return this.packagesService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<PackagePayload>) {
    return this.packagesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.packagesService.remove(id);
  }
}
