import { Type } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { PatientCondition } from "../../generated/prisma/client";

export class CreateWardRoundDto {
  @IsUUID()
  shiftId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RoundPatientStatusDto {
  @IsUUID()
  patientId: string;

  @IsEnum(PatientCondition)
  condition: PatientCondition;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteWardRoundDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoundPatientStatusDto)
  patients: RoundPatientStatusDto[];
}
