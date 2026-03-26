import { IsString, IsOptional, MaxLength, IsEnum, IsDateString, IsUUID } from 'class-validator';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export class CreatePatientDto {
  @IsString()
  @MaxLength(64)
  first_name: string;

  @IsString()
  @MaxLength(64)
  last_name: string;

  @IsString()
  @MaxLength(15)
  phone_number: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsDateString()
  birth_date: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsUUID()
  districtId: string;
}

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone_number?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  birth_date?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsUUID()
  districtId?: string | null;
}
