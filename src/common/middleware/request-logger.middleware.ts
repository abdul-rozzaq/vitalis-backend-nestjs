import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  //   private readonly logger = new Logger("HTTP");
  private readonly logger = console;

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const statusCode = res.statusCode;
      const contentLength = res.getHeader("content-length") ?? "-";
      const protocol = `HTTP/${req.httpVersion}`;
      const timestamp = this.formatDjangoTimestamp(new Date());

      const message = `[${timestamp}] \"${req.method} ${req.originalUrl || req.url} ${protocol}\" ${statusCode} ${contentLength} ${durationMs.toFixed(1)}ms`;

      if (statusCode >= 500) {
        this.logger.error(message);
        return;
      }

      if (statusCode >= 400) {
        this.logger.warn(message);
        return;
      }

      this.logger.log(message);
    });

    next();
  }

  private formatDjangoTimestamp(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
}
