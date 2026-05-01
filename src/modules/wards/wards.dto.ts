import { Type } from "class-transformer";
<<<<<<< muslimbek
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";
=======
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";
>>>>>>> main

// Bemorni palataga yotqizish
export class CreateWardDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  roomId: string;

  @IsOptional()
<<<<<<< muslimbek
=======
  @IsString()
  @MaxLength(20)
  wardNumber?: string;

  @IsOptional()
>>>>>>> main
  @IsDateString()
  expectedOut?: string;

  @IsOptional()
  @IsString()
  note?: string;
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

// Yozuvni yangilash (tahrirlash)
export class UpdateWardDto {
  @IsOptional()
<<<<<<< muslimbek
=======
  @IsString()
  @MaxLength(20)
  wardNumber?: string;

  @IsOptional()
>>>>>>> main
  @IsDateString()
  expectedOut?: string;

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
<<<<<<< muslimbek
}
=======
}
>>>>>>> main
