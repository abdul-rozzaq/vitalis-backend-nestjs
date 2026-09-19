import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { InvoiceItemSourceType } from '../../../generated/prisma/enums';

export enum JournalIssueMode {
  GROUPS = 'GROUPS',
  AMOUNT = 'AMOUNT',
  ITEMS = 'ITEMS',
}

export class IssueJournalInvoicesDto {
  @IsEnum(JournalIssueMode)
  mode: JournalIssueMode;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,13}(\.\d{1,2})?$/)
  amount?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  itemIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(InvoiceItemSourceType, { each: true })
  groups?: InvoiceItemSourceType[];

  @IsUUID()
  requestId: string;
}
