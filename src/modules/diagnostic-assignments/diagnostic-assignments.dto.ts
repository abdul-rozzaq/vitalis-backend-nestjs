import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class CreateDiagnosticAssignmentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  diagnosticsId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDiagnosticAssignmentDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  diagnosticsId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}