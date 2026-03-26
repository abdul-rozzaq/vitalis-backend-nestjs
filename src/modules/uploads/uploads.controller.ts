import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

const multerOptions = {
  storage: diskStorage({
    destination: './uploads/photos',
    filename: (req, file, callback) => {
      const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  fileFilter: (req: any, file: Express.Multer.File, callback: any) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(
        new HttpException('Only image files are allowed', HttpStatus.BAD_REQUEST),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};

@Controller('uploads')
export class UploadsController {
  @Post('photo')
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    return { url: `/uploads/photos/${file.filename}` };
  }
}
