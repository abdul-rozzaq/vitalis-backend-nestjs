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
  @MaxLength(32)
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
  @MaxLength(32)
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