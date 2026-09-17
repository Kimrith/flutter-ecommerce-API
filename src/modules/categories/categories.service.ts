import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const slug =
      createCategoryDto.slug || this.generateSlug(createCategoryDto.name);

    const existingCategory = await this.prisma.category.findFirst({
      where: {
        OR: [{ name: createCategoryDto.name }, { slug }],
      },
    });

    if (existingCategory) {
      throw new ConflictException('Category with name or slug already exists');
    }

    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        slug,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          take: 10,
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);

    let slug = updateCategoryDto.slug;
    if (updateCategoryDto.name && !slug) {
      slug = this.generateSlug(updateCategoryDto.name);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...updateCategoryDto,
        ...(slug ? { slug } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }
}
