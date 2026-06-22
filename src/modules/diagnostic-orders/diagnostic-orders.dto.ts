import { IsEnum, IsOptional, IsString } from "class-validator";
import { DiagnosticItemStatus } from "../../generated/prisma/client";

export class UpdateDiagnosticOrderItemDto {
  @IsOptional()
  @IsEnum(DiagnosticItemStatus)
  status?: DiagnosticItemStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AddDiagnosticOrderItemFileDto {
  @IsString()
  url: string;

  @IsString()
  name: string;
}
