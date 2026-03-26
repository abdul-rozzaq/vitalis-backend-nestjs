import { HttpException } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}
