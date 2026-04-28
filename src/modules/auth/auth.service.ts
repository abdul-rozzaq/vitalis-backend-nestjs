import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { RoleName } from "../../common/enums/role-name.enum";
import { AppException } from "../../common/exceptions/app.exception";
import { UsersRepository } from "../users/users.repository";
import { ChangePasswordDto, RegisterDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterDto) {
    const existingUser = await this.usersRepository.findByPhone(data.phone);

    if (existingUser) {
      throw new AppException("User with this phone number already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.usersRepository.create({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      password: hashedPassword,
      role: (data.role ?? RoleName.TEXNIK_HODIM) as any,
    });

    return this.generateAuthResponse(user);
  }

  async login(phone: string, password: string) {
    const user = await this.usersRepository.findByPhone(phone);

    if (!user) {
      throw new AppException("Invalid phone number or password", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppException("Invalid phone number or password", 401);
    }

    return this.generateAuthResponse(user);
  }

  async getMe(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new AppException("User not found", 400);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new AppException("User not found", 404);
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new AppException("Current password is incorrect", 400);
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepository.update(userId, { password: hashed });

    return { message: "Password changed successfully" };
  }

  private generateAuthResponse(user: any) {
    const access_token = this.jwtService.sign({
      userId: user.id,
      role: user.role,
    });

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token,
    };
  }
}
