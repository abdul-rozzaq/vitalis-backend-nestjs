import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ShiftStatus, UserRole } from "../../generated/prisma/client";

/** Bitta so'rovda biriktirilishi mumkin bo'lgan xodimlar chegarasi. */
export const MAX_STAFF_PER_SHIFT = 50;
/** Bulk amallar uchun smenalar chegarasi. */
export const MAX_BULK_SHIFTS = 500;
/** Generatsiya qilinadigan maksimal davr (kun). */
export const MAX_GENERATE_DAYS = 92;

export class ShiftStaffInputDto {
  @IsUUID()
  userId: string;

  @IsEnum(UserRole)
  role: UserRole;
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
  @ArrayMaxSize(MAX_STAFF_PER_SHIFT)
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

  @IsEnum(UserRole)
  role: UserRole;
}

export class ShiftsQueryDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  /** Klinika kuni ("YYYY-MM-DD") yoki to'liq ISO timestamp. */
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

/** Bir bo'lim uchun davr bo'yicha smena generatsiyasi. */
export class GenerateShiftsDto {
  @IsUUID()
  departmentId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsUUID("4", { each: true })
  templateIds: string[];

  /** Klinika kuni "YYYY-MM-DD" (shu kun ham kiradi). */
  @IsDateString()
  from: string;

  /** Klinika kuni "YYYY-MM-DD" (shu kun ham kiradi). */
  @IsDateString()
  to: string;

  /** Shablondagi `daysOfWeek` ni bekor qiladi. [1=Du .. 7=Ya] */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  /** true — hech narsa yozilmaydi, faqat natija ko'rsatiladi. */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

/** Bir nechta smenaga bir nechta xodimni bittada biriktirish. */
export class BulkAssignDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_BULK_SHIFTS)
  @IsUUID("4", { each: true })
  shiftIds: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_STAFF_PER_SHIFT)
  @ValidateNested({ each: true })
  @Type(() => ShiftStaffInputDto)
  staff: ShiftStaffInputDto[];

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
