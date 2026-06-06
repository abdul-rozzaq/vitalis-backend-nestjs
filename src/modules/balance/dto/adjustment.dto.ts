import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { BalanceTxType } from '../../../generated/prisma/enums';

export class AdjustmentDto {
  @IsNumberString()
  amount: string;

  @IsEnum(BalanceTxType)
  type: BalanceTxType;

  @IsOptional()
  @IsString()
  note?: string;
}
