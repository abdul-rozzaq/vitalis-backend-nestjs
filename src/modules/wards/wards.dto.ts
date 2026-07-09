import { Type } from "class-transformer";
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

// Bemorni palataga yotqizish
export class CreateWardDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  roomId: string;

  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @IsOptional()
  @IsDateString()
  expectedOut?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  companionsCount?: number;

  // Price snapshot — if omitted, service fills from department defaults
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  patientPricePerDay?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  companionPricePerDay?: number | null;

  // Free days bonus — NOT stored in DB; used only to trigger earnBonus
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeDays?: number;
}

// Yozuvni yangilash — HAMMA maydon optional
export class UpdateWardDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @IsOptional()
  @IsDateString()
  expectedOut?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  companionsCount?: number;

  // Future billing prices — changing these does NOT recalculate past transactions
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  patientPricePerDay?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  companionPricePerDay?: number | null;
}

// Bemorni palatadan chiqarish
export class CheckOutDto {
  @IsOptional()
  @IsDateString()
  actualOut?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

// Ro'yxat filtrlari
export class WardQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
