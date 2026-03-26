import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export class CreateAppointmentDto {
  @IsDateString()
  dateTime: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

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
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;
}
