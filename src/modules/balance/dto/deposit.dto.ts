import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class DepositDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsString()
  note?: string;
}
