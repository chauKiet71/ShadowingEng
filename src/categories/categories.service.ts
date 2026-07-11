import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { lessonCount: 'desc' },
    });
  }

  async findPopular() {
    return this.prisma.category.findMany({
      where: { isPopular: true },
      orderBy: { lessonCount: 'desc' },
    });
  }
}
