import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProcedureDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsUUID()
  departmentId: string;
}

export class UpdateProcedureDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;
}
