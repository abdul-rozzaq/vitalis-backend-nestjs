import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";
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
