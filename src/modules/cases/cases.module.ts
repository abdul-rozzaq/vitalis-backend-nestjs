import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CasesController, PatientCasesController } from "./cases.controller";
import { CasesRepository } from "./cases.repository";
import { CasesService } from "./cases.service";

@Module({
  imports: [PrismaModule],
  controllers: [CasesController, PatientCasesController],
  providers: [CasesService, CasesRepository],
  exports: [CasesService],
})
export class CasesModule {}
