import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from "class-validator";

export class CreateDistrictDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsUUID()
  regionId: string;
}

export class UpdateDistrictDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;
}
