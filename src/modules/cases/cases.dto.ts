import { IsArray, IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { CaseStepStatus, CaseStepType } from "../../generated/prisma/client";

export class CreateCaseDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;
}

export class AddCaseStepDto {
  @IsEnum(CaseStepType)
  type: CaseStepType;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsOptional()
  @IsISO8601()
  dateTime?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  // LAB-specific
  @IsOptional()
  @IsUUID()
  laboratoryId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  serviceIds?: string[];

  // true bo'lsa, invois hozircha yaratilmaydi — laboratoriyaga yuboriladi va
  // labarant o'zi narxni belgilab, keyinroq "Invois yaratish" amali orqali
  // yaratadi. Berilmasa/false bo'lsa, invois hozirning o'zida yaratiladi
  // (kerak bo'lsa labTotalPrice bilan chegirma qilingan holda).
  @IsOptional()
  @IsBoolean()
  deferLabInvoice?: boolean;

  // Invois hozir yaratilayotganda (deferLabInvoice != true) umumiy summani
  // qo'lda o'zgartirish uchun (masalan chegirma berish). Berilmasa,
  // xizmatlar narxlari yig'indisi ishlatiladi.
  @IsOptional()
  @IsNumber()
  @Min(0)
  labTotalPrice?: number;

  // DIAGNOSTIC-specific (LAB ga o'xshash)
  @IsOptional()
  @IsUUID()
  diagnosticsId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  diagnosticServiceIds?: string[];

  // Procedure step specific
  @IsOptional()
  @IsUUID()
  procedureId?: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;
}

export class UpdateCaseStepDto {
  @IsOptional()
  @IsEnum(CaseStepStatus)
  status?: CaseStepStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsISO8601()
  completedAt?: string;
}