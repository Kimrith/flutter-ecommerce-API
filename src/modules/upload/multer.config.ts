import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

export const multerStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads';
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    cb(null, `file-${uniqueSuffix}${ext}`);
  },
});

export const imageFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return cb(
      new BadRequestException('Only image files (jpg, jpeg, png, gif, webp, svg) are allowed!'),
      false,
    );
  }
  cb(null, true);
};
