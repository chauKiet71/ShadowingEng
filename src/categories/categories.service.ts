import { Injectable } from '@nestjs/common';
import { listCatalogCategories } from '../catalog/content-catalog';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const catalog = listCatalogCategories();
    if (catalog.length > 0) return catalog;
    return this.prisma.category.findMany({
      orderBy: { lessonCount: 'desc' },
    });
  }

  async findPopular() {
    const catalog = listCatalogCategories(true);
    if (catalog.length > 0) return catalog;
    return this.prisma.category.findMany({
      where: { isPopular: true },
      orderBy: { lessonCount: 'desc' },
    });
  }
}
