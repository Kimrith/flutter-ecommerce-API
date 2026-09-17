import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { imageFileFilter, multerStorage } from '../upload/multer.config';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get catalog products with filter & search' })
  async findAll(@Query() filterDto: FilterProductDto) {
    return this.productsService.findAll(filterDto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product details by ID' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product (Supports multiple image file uploads / FormFile)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'iPhone 15 Pro' },
        slug: { type: 'string', example: 'iphone-15-pro' },
        description: { type: 'string', example: 'Flagship smartphone' },
        price: { type: 'number', example: 999.99 },
        stock: { type: 'integer', example: 50 },
        sku: { type: 'string', example: 'SKU-IPH-15P' },
        categoryId: { type: 'string', example: 'category-uuid-1234' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Product image files (FormFile)',
        },
      },
      required: ['name', 'price', 'categoryId'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multerStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    let images = createProductDto.images || [];
    if (files && files.length > 0) {
      const host = req.get ? req.get('host') : req.headers.host;
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      const uploadedUrls = files.map((file) =>
        host ? `${protocol}://${host}/uploads/${file.filename}` : `/uploads/${file.filename}`,
      );
      images = [...images, ...uploadedUrls];
    }
    return this.productsService.create({ ...createProductDto, images });
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (Supports multiple image file uploads / FormFile)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'iPhone 15 Pro' },
        slug: { type: 'string', example: 'iphone-15-pro' },
        description: { type: 'string', example: 'Flagship smartphone' },
        price: { type: 'number', example: 999.99 },
        stock: { type: 'integer', example: 50 },
        sku: { type: 'string', example: 'SKU-IPH-15P' },
        categoryId: { type: 'string', example: 'category-uuid-1234' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Product image files (FormFile)',
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multerStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    let images = updateProductDto.images;
    if (files && files.length > 0) {
      const host = req.get ? req.get('host') : req.headers.host;
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      const uploadedUrls = files.map((file) =>
        host ? `${protocol}://${host}/uploads/${file.filename}` : `/uploads/${file.filename}`,
      );
      images = images ? [...images, ...uploadedUrls] : uploadedUrls;
    }
    return this.productsService.update(id, { ...updateProductDto, ...(images ? { images } : {}) });
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Admin/Merchant)' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
