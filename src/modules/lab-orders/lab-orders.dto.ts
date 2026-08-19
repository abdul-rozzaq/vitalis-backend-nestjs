import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { LabItemStatus } from "../../generated/prisma/client";

export class UpdateLabOrderItemDto {
  @IsOptional()
  @IsEnum(LabItemStatus)
  status?: LabItemStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

// Laborant natija kiritish sahifasida buyurtmaga bir nechta qo'shimcha xizmat
// qo'shishi uchun. isPaid=true bo'lsa — xizmatlar narxi mavjud hisobga
// (invoice) qo'shiladi, false bo'lsa — bepul deb belgilanadi va hisobga
// qo'shilmaydi. `totalPrice` berilsa, xizmatlar narxlari yig'indisi o'rniga
// shu summa hisobga qo'shiladi (masalan chegirma berish uchun).
export class AddLabOrderItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceIds: string[];

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number;
}

// Bemorni laboratoriyaga yuborishda invois kechiktirilgan bo'lsa
// (deferLabInvoice=true), labarant shu DTO orqali buyurtmaning hali
// hisoblanmagan xizmatlari uchun invoisni o'zi yaratadi. `totalPrice`
// berilsa (masalan chegirma uchun), xizmatlar narxlari yig'indisi o'rniga
// shu summa hisobga qo'shiladi.
export class CreateLabOrderInvoiceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number;
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