import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { imageFileFilter, multerStorage } from '../upload/multer.config';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (Supports image file upload / FormFile)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Electronics' },
        slug: { type: 'string', example: 'electronics' },
        description: { type: 'string', example: 'Gadgets and electronic devices' },
        image: { type: 'string', format: 'binary', description: 'Category image file' },
      },
      required: ['name'],
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multerStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    let imageUrl = createCategoryDto.image;
    if (file) {
      const host = req.get ? req.get('host') : req.headers.host;
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      imageUrl = host ? `${protocol}://${host}/uploads/${file.filename}` : `/uploads/${file.filename}`;
    }
    return this.categoriesService.create({ ...createCategoryDto, image: imageUrl });
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (Supports image file upload / FormFile)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Electronics' },
        slug: { type: 'string', example: 'electronics' },
        description: { type: 'string', example: 'Gadgets and electronic devices' },
        image: { type: 'string', format: 'binary', description: 'Category image file' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multerStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    let imageUrl = updateCategoryDto.image;
    if (file) {
      const host = req.get ? req.get('host') : req.headers.host;
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      imageUrl = host ? `${protocol}://${host}/uploads/${file.filename}` : `/uploads/${file.filename}`;
    }
    return this.categoriesService.update(id, { ...updateCategoryDto, image: imageUrl });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
