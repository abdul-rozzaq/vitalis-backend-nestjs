import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class CreateLaboratoryAssignmentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  laboratoryId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLaboratoryAssignmentDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
