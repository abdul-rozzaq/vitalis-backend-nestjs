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
import { InvoiceItemSourceType, InvoiceSourceType } from '../../../generated/prisma/enums';

export class CreateInvoiceItemDto {
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

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsEnum(InvoiceSourceType)
  sourceType: InvoiceSourceType;

  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @IsOptional()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  note?: string;
}
