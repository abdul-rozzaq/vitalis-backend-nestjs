import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/** "HH:mm" (00:00–23:59) */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TIME_MESSAGE = "Vaqt HH:mm formatida bo'lishi kerak";

export class CreateShiftTemplateDto {
  @IsUUID()
  departmentId: string;

  @IsString()
  @MaxLength(64)
  name: string;

  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  startTime: string;

  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  endTime: string;

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

  /** [1=Dushanba .. 7=Yakshanba]. Bo'sh = har kuni. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];
}

export class UpdateShiftTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  endTime?: string;

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
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ShiftTemplatesQueryDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean;
}
