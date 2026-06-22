import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";
import { ShiftEventType } from "../../generated/prisma/enums";

export class ShiftEventsQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(ShiftEventType)
  type?: ShiftEventType;
}
