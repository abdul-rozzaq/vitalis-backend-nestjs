import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export enum MealRelation {
  BEFORE_MEAL = "BEFORE_MEAL",
  AFTER_MEAL = "AFTER_MEAL",
  WITH_MEAL = "WITH_MEAL",
  AT_SPECIFIC_TIME = "AT_SPECIFIC_TIME",
}

export class PrescriptionItemDto {
  @IsUUID()
  medicineId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  dosage: string;

  @IsInt()
  @Min(1)
  frequency: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(MealRelation)
  mealRelation: MealRelation;

  @IsOptional()
  @IsString()
  specificTime?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpsertPrescriptionDto {
  @IsUUID()
  appointmentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
