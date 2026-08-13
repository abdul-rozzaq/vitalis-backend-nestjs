import { Module } from "@nestjs/common";
import { PatientSourcesController } from "./patient-sources.controller";
import { PatientSourcesService } from "./patient-sources.service";
import { PatientSourcesRepository } from "./patient-sources.repository";

@Module({
  controllers: [PatientSourcesController],
  providers: [PatientSourcesService, PatientSourcesRepository],
  exports: [PatientSourcesService],
})
export class PatientSourcesModule {}
