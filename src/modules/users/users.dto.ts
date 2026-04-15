import { IsString, IsUUID, MinLength, MaxLength, IsBoolean, IsOptional, IsDate, Matches } from "class-validator";
import { Type } from "class-transformer";

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: "First name must be at least 2 characters" })
  @MaxLength(50, { message: "First name must be at most 50 characters" })
  first_name: string;

  @IsString()
  @MinLength(2, { message: "Last name must be at least 2 characters" })
  @MaxLength(50, { message: "Last name must be at most 50 characters" })
  last_name: string;

  @IsString()
  @MaxLength(20)
  @Matches(/^\+998[0-9]{9}$/, { message: "Phone must be a valid Uzbek number (+998XXXXXXXXX)" })
  phone: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters" })
  @MaxLength(100, { message: "Password must be at most 100 characters" })
  password: string;

  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsBoolean()
  isSuperUser?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthday?: Date | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo?: string | null;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+998[0-9]{9}$/, { message: "Phone must be a valid Uzbek number (+998XXXXXXXXX)" })
  phone?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  isSuperUser?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthday?: Date | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo?: string | null;
}
