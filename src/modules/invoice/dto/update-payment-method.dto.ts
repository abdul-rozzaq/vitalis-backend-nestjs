import { IsEnum } from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';

export class UpdatePaymentMethodDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
