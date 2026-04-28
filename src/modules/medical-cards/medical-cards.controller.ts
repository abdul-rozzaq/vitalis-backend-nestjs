import { Body, Controller, Get, Param, Patch, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { MedicalCardDocumentService } from "./medical-card-document.service";
import { CreateMedicalCard003Dto, UpdateMedicalCard003Dto } from "./medical-cards.dto";
import { MedicalCardsService } from "./medical-cards.service";

@Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.HAMSHIRA)
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
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findById(id, user.userId, user.role === RoleName.DOCTOR);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateMedicalCard003Dto, @CurrentUser() user: JwtPayload) {
    return this.service.update(id, dto, user.userId, user.role === RoleName.DOCTOR);
  }

  @Get(":id/export")
  async export(@Param("id") id: string, @Res() res: Response, @CurrentUser() user: JwtPayload) {
    const card = await this.service.findById(id, user.userId, user.role === RoleName.DOCTOR);
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

@Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.HAMSHIRA)
@Controller("patients/:patientId/medical-cards")
export class PatientMedicalCardsController {
  constructor(private readonly service: MedicalCardsService) {}

  @Get()
  findByPatient(@Param("patientId") patientId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findByPatientId(patientId, user.userId, user.role === RoleName.DOCTOR);
  }
}
