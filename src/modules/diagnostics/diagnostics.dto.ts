import { IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from "class-validator";

export class CreateDiagnosticsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDiagnosticsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class CreateDiagnosticServiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number | null;
}

export class UpdateDiagnosticServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number | null;
}


export class CreateDiagnosticOrderDto {
  diagnosticsId: string;
  items: Array<{
    serviceId: string;
    quantity?: number;
  }>;
  note?: string;
}

export class UpdateDiagnosticOrderDto {
  status?: "PENDING" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELLED";
  note?: string;
}