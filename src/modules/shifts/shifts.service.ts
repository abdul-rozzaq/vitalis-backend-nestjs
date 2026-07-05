import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RoleName } from "../../common/enums/role-name.enum";
import { ShiftStaffRole, WardStatus } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AssignStaffDto, CreateShiftDto, ShiftsQueryDto, ShiftStaffInputDto, UpdateShiftDto } from "./shifts.dto";

const STAFF_SELECT = { id: true, first_name: true, last_name: true, role: true } as const;

const SHIFT_INCLUDE = {
  department: { select: { id: true, name: true } },
  staff: { include: { user: { select: STAFF_SELECT } } },
  requirements: { include: { role: true } },
  assignments: { include: { user: { select: STAFF_SELECT }, role: true } },
} as const;

type ShiftWithStaff = {
  requiredDoctors: number;
  requiredNurses: number;
  staff: { role: ShiftStaffRole }[];
};

/** Har bir smenaga required-vs-assigned hisobini qo'shadi. */
function withStaffing<T extends ShiftWithStaff>(shift: T) {
  const assignedDoctors = shift.staff.filter((s) => s.role === ShiftStaffRole.DOCTOR).length;
  const assignedNurses = shift.staff.filter((s) => s.role === ShiftStaffRole.NURSE).length;
  return {
    ...shift,
    staffing: {
      requiredDoctors: shift.requiredDoctors,
      assignedDoctors,
      requiredNurses: shift.requiredNurses,
      assignedNurses,
    },
  };
}

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Ro'yxat / kalendar ─────────────────────────────────────────────────────

  async list(query: ShiftsQueryDto) {
    const where: any = {};
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.AND = [];
      if (query.from) where.AND.push({ endAt: { gte: new Date(query.from) } });
      if (query.to) where.AND.push({ startAt: { lte: new Date(query.to) } });
    }

    const shifts = await this.prisma.shift.findMany({
      where,
      include: SHIFT_INCLUDE,
      orderBy: { startAt: "asc" },
    });
    return shifts.map(withStaffing);
  }

  async retrieve(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id }, include: SHIFT_INCLUDE });
    if (!shift) throw new NotFoundException("Smena topilmadi");
    return withStaffing(shift);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(dto: CreateShiftDto) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    if (start >= end) throw new BadRequestException("Boshlanish vaqti tugash vaqtidan oldin bo'lishi kerak");

    const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId }, select: { id: true } });
    if (!dept) throw new NotFoundException("Bo'lim topilmadi");

    const staff = dto.staff ?? [];
    await this.validateStaff(staff);

    const shift = await this.prisma.shift.create({
      data: {
        departmentId: dto.departmentId,
        startAt: start,
        endAt: end,
        requiredDoctors: dto.requiredDoctors ?? 1,
        requiredNurses: dto.requiredNurses ?? 1,
        note: dto.note,
        staff: staff.length ? { create: staff.map((s) => ({ userId: s.userId, role: s.role })) } : undefined,
      },
    });

    // Dual-write requirements and assignments
    const docRole = await this.getRoleByCode('DOCTOR');
    const nurseRole = await this.getRoleByCode('NURSE');

    const reqs = [];
    if (dto.requiredDoctors) reqs.push({ shiftId: shift.id, roleId: docRole.id, requiredCount: dto.requiredDoctors });
    else reqs.push({ shiftId: shift.id, roleId: docRole.id, requiredCount: 1 });
    if (dto.requiredNurses) reqs.push({ shiftId: shift.id, roleId: nurseRole.id, requiredCount: dto.requiredNurses });
    else reqs.push({ shiftId: shift.id, roleId: nurseRole.id, requiredCount: 1 });
    
    await this.prisma.shiftRequirement.createMany({ data: reqs });

    if (staff.length) {
      const assigns = staff.map(s => ({
        shiftId: shift.id,
        userId: s.userId,
        roleId: s.role === ShiftStaffRole.DOCTOR ? docRole.id : nurseRole.id
      }));
      await this.prisma.shiftAssignment.createMany({ data: assigns });
    }

    const finalShift = await this.prisma.shift.findUnique({ where: { id: shift.id }, include: SHIFT_INCLUDE });
    return withStaffing(finalShift as any);
  }

  async update(id: string, dto: UpdateShiftDto) {
    const existing = await this.prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Smena topilmadi");

    const start = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const end = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    if (start >= end) throw new BadRequestException("Boshlanish vaqti tugash vaqtidan oldin bo'lishi kerak");

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId }, select: { id: true } });
      if (!dept) throw new NotFoundException("Bo'lim topilmadi");
    }

    const shift = await this.prisma.shift.update({
      where: { id },
      data: {
        departmentId: dto.departmentId,
        startAt: dto.startAt ? start : undefined,
        endAt: dto.endAt ? end : undefined,
        requiredDoctors: dto.requiredDoctors,
        requiredNurses: dto.requiredNurses,
        note: dto.note,
        status: dto.status,
      },
    });

    // Dual-update requirements
    if (dto.requiredDoctors !== undefined || dto.requiredNurses !== undefined) {
      const docRole = await this.getRoleByCode('DOCTOR');
      const nurseRole = await this.getRoleByCode('NURSE');
      
      if (dto.requiredDoctors !== undefined) {
        await this.prisma.shiftRequirement.upsert({
          where: { shiftId_roleId: { shiftId: id, roleId: docRole.id } },
          create: { shiftId: id, roleId: docRole.id, requiredCount: dto.requiredDoctors },
          update: { requiredCount: dto.requiredDoctors }
        });
      }
      if (dto.requiredNurses !== undefined) {
        await this.prisma.shiftRequirement.upsert({
          where: { shiftId_roleId: { shiftId: id, roleId: nurseRole.id } },
          create: { shiftId: id, roleId: nurseRole.id, requiredCount: dto.requiredNurses },
          update: { requiredCount: dto.requiredNurses }
        });
      }
    }

    const finalShift = await this.prisma.shift.findUnique({ where: { id }, include: SHIFT_INCLUDE });
    return withStaffing(finalShift as any);
  }

  async delete(id: string) {
    const existing = await this.prisma.shift.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException("Smena topilmadi");
    await this.prisma.shift.delete({ where: { id } });
    return { message: "Smena o'chirildi" };
  }

  // ── Xodim biriktirish ──────────────────────────────────────────────────────

  async assignStaff(id: string, dto: AssignStaffDto) {
    const shift = await this.prisma.shift.findUnique({ where: { id }, select: { id: true, startAt: true, endAt: true } });
    if (!shift) throw new NotFoundException("Smena topilmadi");
    await this.validateStaffRole(dto.userId, dto.role);

    // Improvement 3: Overlap validation
    const overlapping = await this.prisma.shiftStaff.findFirst({
      where: {
        userId: dto.userId,
        shift: {
          id: { not: id },
          startAt: { lt: shift.endAt },
          endAt: { gt: shift.startAt }
        }
      }
    });
    if (overlapping) throw new BadRequestException("Xodim bu vaqtda boshqa smenaga biriktirilgan (Overlap)");

    await this.prisma.shiftStaff.upsert({
      where: { shiftId_userId: { shiftId: id, userId: dto.userId } },
      create: { shiftId: id, userId: dto.userId, role: dto.role },
      update: { role: dto.role },
    });

    // Dual-write to ShiftAssignment
    const roleId = (await this.getRoleByCode(dto.role)).id;
    await this.prisma.shiftAssignment.upsert({
      where: { shiftId_userId: { shiftId: id, userId: dto.userId } },
      create: { shiftId: id, userId: dto.userId, roleId },
      update: { roleId },
    });

    return this.retrieve(id);
  }

  async unassignStaff(id: string, userId: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id }, select: { id: true } });
    if (!shift) throw new NotFoundException("Smena topilmadi");
    await this.prisma.shiftStaff.deleteMany({ where: { shiftId: id, userId } });
    await this.prisma.shiftAssignment.deleteMany({ where: { shiftId: id, userId } });
    return this.retrieve(id);
  }

  // ── Xodim uchun (duty ekrani) ──────────────────────────────────────────────

  async getMyActive(userId: string) {
    const now = new Date();
    const shifts = await this.prisma.shift.findMany({
      where: { startAt: { lte: now }, endAt: { gte: now }, staff: { some: { userId } } },
      include: SHIFT_INCLUDE,
      orderBy: { startAt: "asc" },
    });
    return shifts.map(withStaffing);
  }

  async getMyUpcoming(userId: string) {
    const now = new Date();
    const shifts = await this.prisma.shift.findMany({
      where: { endAt: { gte: now }, staff: { some: { userId } } },
      include: SHIFT_INCLUDE,
      orderBy: { startAt: "asc" },
      take: 50,
    });
    return shifts.map(withStaffing);
  }

  // ── Smena bo'limi bo'yicha xonalar + bemorlar (board) ──────────────────────

  async getBoard(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id }, select: { departmentId: true } });
    if (!shift) throw new NotFoundException("Smena topilmadi");

    const rooms = await this.prisma.room.findMany({
      where: { departmentId: shift.departmentId },
      select: { id: true, name: true, floor: true, capacity: true },
      orderBy: { name: "asc" },
    });
    const roomIds = rooms.map((r) => r.id);

    const wards = roomIds.length
      ? await this.prisma.wards.findMany({
          where: { roomId: { in: roomIds }, status: WardStatus.OCCUPIED },
          include: { patient: { select: { id: true, first_name: true, last_name: true } } },
          orderBy: { checkIn: "asc" },
        })
      : [];

    return rooms.map((room) => ({
      ...room,
      patients: wards
        .filter((w) => w.roomId === room.id)
        .map((w) => ({ wardId: w.id, checkIn: w.checkIn, daysStayed: w.daysStayed, status: w.status, patient: w.patient })),
    }));
  }

  // ── Navbat tekshiruvi (wards check-in/out gate) ────────────────────────────

  async assertUserOnDutyForRoom(userId: string, roomId: string): Promise<void> {
    const now = new Date();
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { departmentId: true } });
    if (!room?.departmentId) throw new ForbiddenException("Bu xona bo'limga biriktirilmagan");

    const activeShifts = await this.prisma.shift.findMany({
      where: { departmentId: room.departmentId, startAt: { lte: now }, endAt: { gte: now } },
      select: { staff: { select: { userId: true } } },
    });
    if (!activeShifts.length) throw new ForbiddenException("Hozir bu bo'limda faol smena yo'q");

    const onDuty = activeShifts.some((s) => s.staff.some((st) => st.userId === userId));
    if (!onDuty) throw new ForbiddenException("Siz hozir bu bo'limda navbatda emassiz");
  }

  // ── Yordamchilar ───────────────────────────────────────────────────────────

  private async validateStaff(staff: ShiftStaffInputDto[]) {
    const seen = new Set<string>();
    for (const s of staff) {
      if (seen.has(s.userId)) throw new BadRequestException("Bir xodim ikki marta biriktirilgan");
      seen.add(s.userId);
      await this.validateStaffRole(s.userId, s.role);
    }
  }

  private async validateStaffRole(userId: string, role: ShiftStaffRole) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException("Xodim topilmadi");
    if (role === ShiftStaffRole.DOCTOR && user.role !== RoleName.DOCTOR) {
      throw new BadRequestException("Tanlangan xodim shifokor emas");
    }
    if (role === ShiftStaffRole.NURSE && user.role !== RoleName.HAMSHIRA) {
      throw new BadRequestException("Tanlangan xodim hamshira emas");
    }
  }

  private async getRoleByCode(code: string) {
    let role = await this.prisma.staffRole.findUnique({ where: { code } });
    if (!role) {
      role = await this.prisma.staffRole.create({ data: { code, name: code } });
    }
    return role;
  }
}
