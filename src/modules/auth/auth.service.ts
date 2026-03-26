import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AppException } from '../../common/exceptions/app.exception';
import { UsersRepository } from '../users/users.repository';
import { RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterDto & { roleId?: string }) {
    const existingUser = await this.usersRepository.findByEmail(data.email);

    if (existingUser) {
      throw new AppException('User with this email already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // For registration without explicit roleId, find default USER role
    let roleId = data.roleId;
    if (!roleId) {
      throw new AppException('roleId is required', 400);
    }

    const user = await this.usersRepository.create({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      password: hashedPassword,
      roleId,
    });

    return this.generateAuthResponse(user);
  }

  async login(email: string, password: string) {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new AppException('Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppException('Invalid email or password', 401);
    }

    return this.generateAuthResponse(user);
  }

  async getMe(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new AppException('User not found', 400);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private generateAuthResponse(user: any) {
    const access_token = this.jwtService.sign({
      userId: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
      isSuperUser: user.isSuperUser,
    });

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token,
    };
  }
}
