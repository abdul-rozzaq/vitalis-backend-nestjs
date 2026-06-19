import { IsArray, IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class MaterializeShiftDto {
  @IsUUID()
  roomShiftId: string;

  @IsUUID()
  roomId: string;
}

export class CreateShiftOverrideDto {
  @IsUUID()
  roomShiftId: string;

  @IsUUID()
  roomId: string;

  @IsDateString()
  date: string;

  @IsUUID()
  doctorId: string;

  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  nurseIds?: string[];
}

export class ShiftAssignmentsQueryDto {
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateSwapDto {
  @IsUUID()
  fromAssignmentId: string;

  @IsUUID()
  toAssignmentId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class PartialTransferDto {
  @IsUUID()
  assignmentId: string;

  @IsUUID()
  toDoctorId: string;

  @IsInt()
  @Min(0)
  @Max(23)
  windowStart: number;

  @IsInt()
  @Min(1)
  @Max(24)
  windowEnd: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class OvertimeDto {
  @IsUUID()
  assignmentId: string;

  @IsInt()
  @Min(1)
  @Max(48)
  newEndHour: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
