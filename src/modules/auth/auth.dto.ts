import { IsEmail, IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must be at most 50 characters' })
  first_name: string;

  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must be at most 50 characters' })
  last_name: string;

  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(100, { message: 'Password must be at most 100 characters' })
  password: string;

  @IsUUID()
  roleId: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}
