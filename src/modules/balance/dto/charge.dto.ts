import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class ChargeDto {
  @IsNumberString()
  totalAmount: string;

  @IsNumberString()
  cashToUse: string;

  @IsNumberString()
  bonusToUse: string;

  @IsOptional()
  @IsString()
  note?: string;
}
