import { IsString, IsNumber, IsPositive, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number | null;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number | null;
}
