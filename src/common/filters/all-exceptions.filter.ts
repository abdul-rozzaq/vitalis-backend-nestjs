import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { AppException } from "../exceptions/app.exception";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof AppException) {
      return response.status(exception.getStatus()).json({
        message: exception.message,
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      return response.status(status).json(typeof exceptionResponse === "string" ? { message: exceptionResponse } : exceptionResponse);
    }

    // Prisma P2025 — record not found
    if ((exception as any)?.code === "P2025") {
      return response.status(404).json({ message: "Record not found" });
    }

    // Unknown error — don't leak details
    console.error("[ERROR]", exception);
    return response.status(500).json({ message: "Internal server error" });
  }
}
