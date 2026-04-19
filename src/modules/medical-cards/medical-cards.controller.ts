import { Controller, Get, Post, Patch, Param, Body, Res } from "@nestjs/common";
import { Response } from "express";
import { MedicalCardsService } from "./medical-cards.service";
import { MedicalCardDocumentService } from "./medical-card-document.service";
import { CreateMedicalCard003Dto, UpdateMedicalCard003Dto } from "./medical-cards.dto";

@Controller("medical-cards/003x")
export class MedicalCardsController {
  constructor(
    private readonly service: MedicalCardsService,
    private readonly documentService: MedicalCardDocumentService,
  ) {}

  @Post()
  create(@Body() dto: CreateMedicalCard003Dto) {
    return this.service.create(dto);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateMedicalCard003Dto) {
    return this.service.update(id, dto);
  }

  @Get(":id/export")
  async export(@Param("id") id: string, @Res() res: Response) {
    const card = await this.service.findById(id);
    const buffer = await this.documentService.generate(card as any);
    const filename = `medical-card-003x-${card.id.slice(0, 8)}.docx`;

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}

@Controller("patients/:patientId/medical-cards")
export class PatientMedicalCardsController {
  constructor(private readonly service: MedicalCardsService) {}

  @Get()
  findByPatient(@Param("patientId") patientId: string) {
    return this.service.findByPatientId(patientId);
  }
}
