import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateRegionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;
}

export class UpdateRegionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;
}
