import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from "class-validator";
import { ShiftStaffRole, ShiftStatus } from "../../generated/prisma/client";

export class ShiftStaffInputDto {
  @IsUUID()
  userId: string;

  @IsEnum(ShiftStaffRole)
  role: ShiftStaffRole;
}

export class CreateShiftDto {
  @IsUUID()
  departmentId: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  requiredDoctors?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  requiredNurses?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftStaffInputDto)
  staff?: ShiftStaffInputDto[];
}

export class UpdateShiftDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  requiredDoctors?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  requiredNurses?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;
}

export class AssignStaffDto {
  @IsUUID()
  userId: string;

  @IsEnum(ShiftStaffRole)
  role: ShiftStaffRole;
}

export class ShiftsQueryDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;
}
