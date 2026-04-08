import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";

function ensureDirectory(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

const multerOptions = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      const path = "./uploads/photos";
      ensureDirectory(path);
      callback(null, path);
    },
    filename: (req, file, callback) => {
      const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  fileFilter: (req: any, file: Express.Multer.File, callback: any) => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(
        new HttpException(
          "Only image files are allowed",
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};

const fileMulterOptions = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      const path = "./uploads/files";
      ensureDirectory(path);
      callback(null, path);
    },
    filename: (req, file, callback) => {
      const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
};

@Controller("uploads")
export class UploadsController {
  @Post("photo")
  @UseInterceptors(FileInterceptor("photo", multerOptions))
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException("No file uploaded", HttpStatus.BAD_REQUEST);
    }
    return { url: `/uploads/photos/${file.filename}` };
  }

  @Post("file")
  @UseInterceptors(FileInterceptor("file", fileMulterOptions))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException("No file uploaded", HttpStatus.BAD_REQUEST);
    }
    return {
      url: `/uploads/files/${file.filename}`,
      name: file.originalname,
    };
  }
}
