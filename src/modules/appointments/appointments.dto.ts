import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateAppointmentDto {
  @IsDateString()
  dateTime: string;

  @IsUUID()
  patientId: string;

  @IsUUID()
  assignmentId: string;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  dateTime?: string;

  @IsOptional()
  @IsString()
  conclusion?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;
}

export class CreateAppointmentFileDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  url: string;
}
