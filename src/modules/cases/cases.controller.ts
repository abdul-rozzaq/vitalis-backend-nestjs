import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { CaseBillingMode, CaseStatus } from "../../generated/prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { AddCaseStepDto, CreateCaseDto, UpdateCaseStepDto } from "./cases.dto";
import { CasesService } from "./cases.service";

@Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.KASSIR, RoleName.LABARANT)
@Controller("cases")
export class CasesController {
  constructor(private readonly service: CasesService) {}

  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.DOCTOR, RoleName.LABARANT)
  @Post()
  create(@Body() dto: CreateCaseDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  // "To'lov jurnali" sahifasi uchun — bemordan qat'iy nazar, klinika
  // bo'yicha filtrga mos case'lar ro'yxati.
  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.HISOBCHI, RoleName.DIREKTOR)
  @Get()
  findAll(@Query("billingMode") billingMode?: CaseBillingMode, @Query("status") status?: CaseStatus) {
    return this.service.findAll({ billingMode, status });
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findById(id, user);
  }

  // HAMSHIRA shu yerga kiritilgan, lekin service darajasida faqat
  // CaseStepType.PROCEDURE (ukol) bilan cheklangan — boshqa qadam turlarini
  // qo'sha olmaydi (qarang: CasesService.addStep).
  @Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.LABARANT, RoleName.HAMSHIRA)
  @Post(":id/steps")
  addStep(@Param("id") id: string, @Body() dto: AddCaseStepDto, @CurrentUser() user: JwtPayload) {
    return this.service.addStep(id, dto, user);
  }

  @Patch(":id/steps/:stepId")
  updateStep(@Param("id") id: string, @Param("stepId") stepId: string, @Body() dto: UpdateCaseStepDto, @CurrentUser() user: JwtPayload) {
    return this.service.updateStep(id, stepId, dto, user);
  }

  @Roles(RoleName.ADMIN, RoleName.DOCTOR)
  @Delete(":id/steps/:stepId")
  deleteStep(@Param("id") id: string, @Param("stepId") stepId: string, @CurrentUser() user: JwtPayload) {
    return this.service.deleteStep(id, stepId, user);
  }

  @Roles(RoleName.ADMIN)
  @Delete(":id")
  deleteCase(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.service.deleteCase(id, user);
  }

  @Roles(RoleName.ADMIN, RoleName.DOCTOR)
  @Patch(":id/close")
  closeCase(@Param("id") id: string, @Body("status") status: "COMPLETED" | "CANCELLED", @CurrentUser() user: JwtPayload) {
    return this.service.closeCase(id, status ?? "COMPLETED", user);
  }

  // Bir yo'nalishli: keyinchalik bekor qilish (revert) endpointi ataylab yo'q.
  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.DOCTOR)
  @Post(":id/convert-to-master")
  convertToMaster(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.service.convertToMaster(id, user);
  }

  @Get(":id/journal/print")
  async printJournal(@Param("id") id: string, @Res() res: Response) {
    const { buffer, patientCase } = await this.service.generateJournalDocument(id);
    const filename = `jurnal-${patientCase.id.slice(0, 8)}.docx`;

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}

@Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.KASSIR, RoleName.LABARANT)
@Controller("patients/:patientId/cases")
export class PatientCasesController {
  constructor(private readonly service: CasesService) {}

  @Get()
  findByPatient(@Param("patientId") patientId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findByPatientId(patientId, user);
  }
}
