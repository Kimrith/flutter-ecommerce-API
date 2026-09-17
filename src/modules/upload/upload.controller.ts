import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { imageFileFilter, multerStorage } from './multer.config';

@ApiTags('Uploads')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('file')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload single image file (FormFile / multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpg, jpeg, png, webp, gif, svg)',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const host = req.get ? req.get('host') : req.headers.host;
    const url = this.uploadService.getFilePath(file, host);
    return {
      message: 'File uploaded successfully',
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url,
    };
  }

  @Post('files')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload multiple image files (FormFile / multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple image files',
        },
      },
      required: ['files'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multerStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    const host = req.get ? req.get('host') : req.headers.host;
    const urls = this.uploadService.getFilePaths(files, host);
    return {
      message: `${files.length} files uploaded successfully`,
      urls,
    };
  }
}
