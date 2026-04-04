import { Controller, Post, Get, Patch, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterDto, LoginDto, ChangePasswordDto } from './auth.dto';
import { type JwtPayload } from '../../common/types/jwt-payload.type';
import { SkipPermissionCheck } from '../../common/decorators/skip-permission-check.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.phone, dto.password);
  }

  @Get('me')
  @SkipPermissionCheck()
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.userId);
  }

  @Patch('change-password')
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.userId, dto);
  }
}
