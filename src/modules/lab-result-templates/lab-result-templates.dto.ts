import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from "class-validator";

export class LabResultTemplateColumnDto {
  @IsString()
  key: "code" | "indicator" | "result" | "norm" | "unit";

  @IsString()
  label: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;
}

export class LabResultTemplateLayoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LabResultTemplateColumnDto)
  columns: LabResultTemplateColumnDto[];
}

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

  @IsOptional()
  @ValidateNested()
  @Type(() => LabResultTemplateLayoutDto)
  layout?: LabResultTemplateLayoutDto;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => LabResultTemplateLayoutDto)
  layout?: LabResultTemplateLayoutDto;
}
