import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";

export class LabResultTemplateRowDto {
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
}

export class CreateLabResultTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LabResultTemplateRowDto)
  rows: LabResultTemplateRowDto[];
}

export class UpdateLabResultTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LabResultTemplateRowDto)
  rows?: LabResultTemplateRowDto[];
}
