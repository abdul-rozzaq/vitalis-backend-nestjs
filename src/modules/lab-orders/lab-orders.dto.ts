import { IsEnum, IsOptional, IsString } from "class-validator";
import { LabItemStatus } from "../../generated/prisma/client";

export class UpdateLabOrderItemDto {
  @IsOptional()
  @IsEnum(LabItemStatus)
  status?: LabItemStatus;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
