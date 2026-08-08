import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class LabResultColumnDto {
  @IsString()
  key: "code" | "indicator" | "result" | "norm" | "unit";

  @IsString()
  label: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;
}

export class LabResultLayoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LabResultColumnDto)
  columns: LabResultColumnDto[];
}

export class DefaultLabResultRowDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  indicator: string;

  @IsOptional()
  @IsString()
  norm?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateLaboratoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateLaboratoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class CreateLaboratoryServiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DefaultLabResultRowDto)
  defaultRows?: DefaultLabResultRowDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LabResultLayoutDto)
  resultLayout?: LabResultLayoutDto;
}

export class UpdateLaboratoryServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DefaultLabResultRowDto)
  defaultRows?: DefaultLabResultRowDto[] | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LabResultLayoutDto)
  resultLayout?: LabResultLayoutDto;
}
