import { IsString, IsUUID, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must be at most 50 characters' })
  first_name: string;

  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must be at most 50 characters' })
  last_name: string;

  @IsString()
  @MaxLength(20)
  @Matches(/^\+998[0-9]{9}$/, { message: 'Phone must be a valid Uzbek number (+998XXXXXXXXX)' })
  phone: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(100, { message: 'Password must be at most 100 characters' })
  password: string;

  @IsUUID()
  roleId: string;
}

export class LoginDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^\+998[0-9]{9}$/, { message: 'Phone must be a valid Uzbek number (+998XXXXXXXXX)' })
  phone: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @MaxLength(100, { message: 'New password must be at most 100 characters' })
  newPassword: string;
}
