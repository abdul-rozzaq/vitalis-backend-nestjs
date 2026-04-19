import { IsString, IsOptional, IsDateString, IsUUID, IsArray, ValidateNested, MaxLength } from "class-validator";
import { Type } from "class-transformer";

export class DailyNoteDto {
  @IsDateString()
  date: string;

  @IsString()
  note: string;
}

export class CreateMedicalCard003Dto {
  @IsUUID()
  patientId: string;

  @IsDateString()
  admissionDate: string;

  @IsOptional()
  @IsDateString()
  dischargeDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  wardNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  departmentName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  doctorName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nurseName?: string | null;

  @IsOptional()
  @IsString()
  complaints?: string | null;

  @IsOptional()
  @IsString()
  anamnesis?: string | null;

  @IsOptional()
  @IsString()
  lifeAnamnesis?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  diagnosisInitial?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  diagnosisFinal?: string | null;

  @IsOptional()
  @IsString()
  treatment?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyNoteDto)
  dailyNotes?: DailyNoteDto[];
}

export class UpdateMedicalCard003Dto {
  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @IsOptional()
  @IsDateString()
  dischargeDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  wardNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  departmentName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  doctorName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nurseName?: string | null;

  @IsOptional()
  @IsString()
  complaints?: string | null;

  @IsOptional()
  @IsString()
  anamnesis?: string | null;

  @IsOptional()
  @IsString()
  lifeAnamnesis?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  diagnosisInitial?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  diagnosisFinal?: string | null;

  @IsOptional()
  @IsString()
  treatment?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyNoteDto)
  dailyNotes?: DailyNoteDto[];
}
