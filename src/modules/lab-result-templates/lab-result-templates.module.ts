import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { LabResultTemplatesController } from "./lab-result-templates.controller";
import { LabResultTemplatesRepository } from "./lab-result-templates.repository";
import { LabResultTemplatesService } from "./lab-result-templates.service";

@Module({
  imports: [PrismaModule],
  controllers: [LabResultTemplatesController],
  providers: [LabResultTemplatesService, LabResultTemplatesRepository],
  exports: [LabResultTemplatesService],
})
export class LabResultTemplatesModule {}
