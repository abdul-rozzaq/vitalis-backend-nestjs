import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class PayInvoiceDto {
  @IsNumberString()
  cashAmount: string;

  @IsNumberString()
  bonusAmount: string;

  @IsOptional()
  @IsString()
  note?: string;
}
