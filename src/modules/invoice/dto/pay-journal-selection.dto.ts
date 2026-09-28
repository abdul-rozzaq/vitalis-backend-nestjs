import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsString, IsUUID, Matches } from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';

export class PayJournalSelectionDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  itemIds: string[];

  @IsString()
  @Matches(/^\d{1,13}(\.\d{1,2})?$/)
  amount: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsUUID()
  requestId: string;
}
