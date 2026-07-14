import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { LabItemStatus } from "../../generated/prisma/client";

export class UpdateLabOrderItemDto {
  @IsOptional()
  @IsEnum(LabItemStatus)
  status?: LabItemStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AddLabOrderItemFileDto {
  @IsString()
  url: string;

  @IsString()
  name: string;
}

export class LabResultRowDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  indicator: string;

  @IsOptional()
  @IsString()
  result?: string;

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

export class ApplyLabResultTemplateDto {
  @IsString()
  templateId: string;
}

export class BulkSaveLabResultsItemDto {
  @IsString()
  itemId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LabResultRowDto)
  rows: LabResultRowDto[];
}

// "Umumiy" natija kiritish — bitta buyurtmadagi bir nechta xizmat (item)
// natijasini bitta so'rovda saqlaydi. Laborant butun buyurtmani (masalan,
// Koagulogrammaga kiruvchi barcha tahlillarni) bitta ekranda to'ldirib,
// bitta marta "Saqlash"/"Yuborish" bosadi.
export class BulkSaveLabResultsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkSaveLabResultsItemDto)
  items: BulkSaveLabResultsItemDto[];

  @IsOptional()
  @IsBoolean()
  submit?: boolean;
}

export class UpsertLabResultTableDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LabResultRowDto)
  rows: LabResultRowDto[];

  @IsOptional()
  @IsBoolean()
  submit?: boolean;
}