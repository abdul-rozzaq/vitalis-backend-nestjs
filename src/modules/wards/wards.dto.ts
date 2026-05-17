import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

// Bemorni palataga yotqizish
// Bemorni palataga yotqizish
export class CreateWardDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  roomId: string;

  @IsOptional()
  @IsDateString()
  checkIn?: string; // ← QO'SHILDI: agar berilmasa new Date() ishlatiladi

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
  companionsCount?: number = 0;
}

// Yozuvni yangilash — HAMMA maydon optional
export class UpdateWardDto {
  @IsOptional()
  @IsUUID()
  patientId?: string; // ← QO'SHILDI

  @IsOptional()
  @IsUUID()
  roomId?: string; // ← QO'SHILDI

  @IsOptional()
  @IsDateString()
  checkIn?: string; // ← QO'SHILDI: qachon yotgan sanasini o'zgartirish

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

  // OCCUPIED yoki VACATED
  @IsOptional()
  @IsString()
  status?: string;

  // Sana bo'yicha filter (checkIn dan)
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
