import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";
import { createWinstonLogger } from "./common/logger/winston.config";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: createWinstonLogger(),
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }));

  app.enableCors({ origin: true, credentials: true });

  app.setGlobalPrefix("api", { exclude: ["health"] });

  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads",
  });

  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(`Server running on http://localhost:${port}`);
}

bootstrap();
