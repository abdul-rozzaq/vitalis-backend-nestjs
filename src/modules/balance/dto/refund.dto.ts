import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class RefundDto {
  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
