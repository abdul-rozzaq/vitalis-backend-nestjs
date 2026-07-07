import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { InvoiceItemSourceType, InvoiceSourceType, InvoiceStatus } from '../../../generated/prisma/enums';

export class UpdateInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumberString()
  unitPrice: string;

  @IsEnum(InvoiceItemSourceType)
  sourceType: InvoiceItemSourceType;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  dateFrom?: Date;

  @IsOptional()
  dateTo?: Date;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsEnum(InvoiceSourceType)
  sourceType?: InvoiceSourceType;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateInvoiceItemDto)
  items?: UpdateInvoiceItemDto[];

  @IsOptional()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
