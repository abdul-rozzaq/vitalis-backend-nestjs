import { IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';

export class DepositDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsNumberString()
  amount: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;
}
