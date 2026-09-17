import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class UploadService {
  getFilePath(file: Express.Multer.File, host?: string): string {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const filename = file.filename;
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    return host ? `${protocol}://${host}/uploads/${filename}` : `/uploads/${filename}`;
  }

  getFilePaths(files: Express.Multer.File[], host?: string): string[] {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    return files.map((file) => this.getFilePath(file, host));
  }
}
