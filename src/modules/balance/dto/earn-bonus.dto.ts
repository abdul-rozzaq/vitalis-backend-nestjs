import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { BonusTxSource } from '../../../generated/prisma/enums';

export class EarnBonusDto {
  @IsNumberString()
  amount: string;

  @IsEnum(BonusTxSource)
  source: BonusTxSource;

  @IsOptional()
  @IsString()
  note?: string;
}
