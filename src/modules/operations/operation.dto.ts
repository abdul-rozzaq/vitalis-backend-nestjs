import { OperationStatus, SurgeonRole } from '@/generated/prisma/enums';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/* ================= CREATE ================= */

export class CreateOperationSurgeonDto {
  @IsUUID()
  surgeonId: string;

  @IsEnum(SurgeonRole)
  role: SurgeonRole;
}

export class CreateOperationItemDto {
  @IsUUID()
  operationTypeItemId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOperationDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  operationTypeId: string;

  @IsUUID()
  caseId: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsUUID()
  departmentId: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  contractNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateOperationSurgeonDto)
  surgeons: CreateOperationSurgeonDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOperationItemDto)
  items?: CreateOperationItemDto[];

  // Operatsiya yaratilayotganda bemorni bir vaqtning o'zida laboratoriya
  // tahlillariga ham yuborish uchun (masalan, operatsiya oldi tahlillari).
  // Har bir xizmat o'z laboratoriyasiga qarab guruhlanib, tegishli LabOrder
  // yaratiladi va shu operatsiyaning caseStep'iga bog'lanadi.
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  labServiceIds?: string[];
}
/* ================= UPDATE ================= */

export class UpdateOperationSurgeonDto {
  @IsUUID()
  surgeonId: string;

  @IsEnum(SurgeonRole)
  role: SurgeonRole;
}

export class UpdateOperationItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  operationTypeItemId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}
export class UpdateOperationDto {
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  contractNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsEnum(OperationStatus)
  status?: OperationStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOperationSurgeonDto)
  surgeons?: UpdateOperationSurgeonDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOperationItemDto)
  items?: UpdateOperationItemDto[];
}

/* ================= INVOICE ================= */

// Operatsiya tafsilotlari sahifasida "Invois yaratish" bosilganda, xodim
// operatsiyaning umumiy narxidan qanchasiga hozir invois yaratmoqchi ekanini
// tanlashi mumkin (masalan, oldindan qisman to'lov uchun). Agar `amount`
// yuborilmasa yoki umumiy narxga teng bo'lsa, invois avvalgidek to'liq
// tarkibiy qismlar (xizmatlar, lab tahlillari) bilan yaratiladi.
export class CreateOperationInvoiceDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;
}