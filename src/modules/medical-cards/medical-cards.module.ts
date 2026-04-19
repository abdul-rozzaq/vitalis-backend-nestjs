import { Module } from "@nestjs/common";
import { MedicalCardsController, PatientMedicalCardsController } from "./medical-cards.controller";
import { MedicalCardsService } from "./medical-cards.service";
import { MedicalCardsRepository } from "./medical-cards.repository";
import { MedicalCardDocumentService } from "./medical-card-document.service";

@Module({
  controllers: [MedicalCardsController, PatientMedicalCardsController],
  providers: [MedicalCardsService, MedicalCardsRepository, MedicalCardDocumentService],
})
export class MedicalCardsModule {}
