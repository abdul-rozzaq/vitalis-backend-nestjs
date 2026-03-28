import { IsString, IsOptional, MaxLength, IsEnum, IsDateString, IsUUID, Matches } from 'class-validator';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export enum DocumentType {
  PASSPORT = 'PASSPORT',
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  FOREIGN_PASSPORT = 'FOREIGN_PASSPORT',
  RESIDENCE_PERMIT = 'RESIDENCE_PERMIT',
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

  @IsOptional()
  @IsEnum(DocumentType)
  document_type?: DocumentType | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  document_series?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  document_number?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'PINFL must be exactly 14 digits' })
  pinfl?: string | null;

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
  @IsEnum(DocumentType)
  document_type?: DocumentType | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  document_series?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  document_number?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'PINFL must be exactly 14 digits' })
  pinfl?: string | null;

  @IsOptional()
  @IsUUID()
  districtId?: string | null;
}
