import { IsBoolean, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';

export class PayInvoiceDto {
  @IsNumberString()
  cashAmount: string;

  @IsNumberString()
  bonusAmount: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  // true = "to'g'ridan-to'g'ri" mode: top up balance with cashAmount (tagged with
  // paymentMethod) and immediately charge it against the invoice, atomically.
  @IsOptional()
  @IsBoolean()
  topUp?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
