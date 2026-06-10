import { IsArray, IsDateString, IsOptional, IsUUID } from "class-validator";

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
