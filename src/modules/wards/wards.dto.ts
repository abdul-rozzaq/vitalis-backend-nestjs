import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, IsBoolean } from "class-validator";
import { PaymentMethod } from "../../generated/prisma/enums";

// Bemorni palataga yotqizish
export class CreateWardDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  roomId: string;

  // Bemor rasman biriktirilgan bo'lim. Berilmasa — xonaning bo'limi olinadi.
  // Xona bo'limi to'lib qolganda, boshqa bo'lim xonasiga yotqizib, shu bo'limni belgilash mumkin.
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cardNumber?: number;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeDays?: number;

  @IsOptional()
  @IsBoolean()
  isBonusForCompanions?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  prepaymentAmount?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
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
  @IsUUID()
  departmentId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cardNumber?: number | null;

  @IsOptional()
  @IsUUID()
  doctorId?: string | null;

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
