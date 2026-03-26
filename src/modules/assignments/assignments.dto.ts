import {
  IsUUID,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  Matches,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Format: HH:mm' })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Format: HH:mm' })
  endTime: string;
}

export class CreateAssignmentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  departmentId: string;

  @IsOptional()
  @IsUUID()
  roomId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules?: ScheduleDto[];
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsUUID()
  roomId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules?: ScheduleDto[];
}
