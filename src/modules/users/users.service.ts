import { Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AppException } from "../../common/exceptions/app.exception";
import { Prisma, User } from "../../generated/prisma/client";
import { AttendanceService } from "../attendance/attendance.service";
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly repository: UsersRepository,
    private readonly attendanceService: AttendanceService,
  ) {}

  async getAllUsers(role?: string): Promise<Omit<User, "password">[]> {
    const users = await this.repository.findAll(role);
    return users.map((user) => this.excludePassword(user));
  }

  async getUserById(id: string): Promise<Omit<User, "password"> | null> {
    const user = await this.repository.findById(id);
    return user ? this.excludePassword(user) : null;
  }

  async createUser(data: Prisma.UserUncheckedCreateInput): Promise<Omit<User, "password">> {
    const existingUser = await this.repository.findByPhone(data.phone as string);

    if (existingUser) {
      throw new AppException("User with this phone number already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(data.password as string, 10);
    const user = await this.repository.create({ ...data, password: hashedPassword });
    return this.excludePassword(user);
  }

  async updateUser(id: string, data: Prisma.UserUncheckedUpdateInput): Promise<Omit<User, "password">> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password as string, 10);
    }
    const user = await this.repository.update(id, data);

    // Terminal ID shu yerdan (xodim tahrirlash sahifasi) bog'langanda ham
    // eski "bog'lanmagan terminal ID" skanlari avtomatik hal bo'lishi kerak —
    // navbatdagi "Bog'lash" tugmasi bilan bir xil natija.
    if (typeof data.employeeNo === "string" && data.employeeNo) {
      try {
        await this.attendanceService.reprocessUnknownEventsByEmployeeNo(data.employeeNo);
      } catch (err: any) {
        this.logger.error(`Failed to reprocess attendance events for employeeNo=${data.employeeNo}: ${err.message}`);
      }
    }

    return this.excludePassword(user);
  }

  async deleteUser(id: string): Promise<Omit<User, "password">> {
    const user = await this.repository.delete(id);
    return this.excludePassword(user);
  }

  private excludePassword(user: User): Omit<User, "password"> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
