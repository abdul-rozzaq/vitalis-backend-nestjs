import { Module } from "@nestjs/common";
import { InvoiceModule } from "../invoice/invoice.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { CasesController, PatientCasesController } from "./cases.controller";
import { CasesRepository } from "./cases.repository";
import { CasesService } from "./cases.service";

@Module({
  imports: [PrismaModule, InvoiceModule],
  controllers: [CasesController, PatientCasesController],
  providers: [CasesService, CasesRepository],
  exports: [CasesService],
})
export class CasesModule {}
