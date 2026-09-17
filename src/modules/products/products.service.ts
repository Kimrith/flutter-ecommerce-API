import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto, SortBy } from './dto/filter-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Math.floor(1000 + Math.random() * 9000)
    );
  }

  async create(createProductDto: CreateProductDto) {
    const categoryExists = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!categoryExists) {
      throw new NotFoundException('Category not found');
    }

    const slug =
      createProductDto.slug || this.generateSlug(createProductDto.name);

    if (createProductDto.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: createProductDto.sku },
      });
      if (existingSku) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        slug,
        images: createProductDto.images || [],
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(filterDto: FilterProductDto) {
    const {
      search,
      categoryId,
      minPrice,
      maxPrice,
      sortBy,
      page = 1,
      limit = 10,
    } = filterDto;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    let orderBy: any = { createdAt: 'desc' };
    switch (sortBy) {
      case SortBy.PRICE_ASC:
        orderBy = { price: 'asc' };
        break;
      case SortBy.PRICE_DESC:
        orderBy = { price: 'desc' };
        break;
      case SortBy.NAME:
        orderBy = { name: 'asc' };
        break;
      case SortBy.NEWEST:
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(id);

    if (updateProductDto.categoryId) {
      const categoryExists = await this.prisma.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });
      if (!categoryExists) {
        throw new NotFoundException('Category not found');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Product deleted successfully' };
  }
}
