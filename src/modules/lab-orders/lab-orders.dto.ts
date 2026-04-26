import { IsEnum, IsOptional, IsString } from "class-validator";
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
