import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { crossesMidnight } from "./shift-generator";
import { CreateShiftTemplateDto, ShiftTemplatesQueryDto, UpdateShiftTemplateDto } from "./shift-templates.dto";

@Injectable()
export class ShiftTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ShiftTemplatesQueryDto) {
    const templates = await this.prisma.shiftTemplate.findMany({
      where: {
        departmentId: query.departmentId,
        isActive: query.includeInactive ? undefined : true,
      },
      include: { department: { select: { id: true, name: true } } },
      orderBy: [{ departmentId: "asc" }, { startTime: "asc" }],
    });
    return templates.map(this.withDerived);
  }

  async retrieve(id: string) {
    const template = await this.prisma.shiftTemplate.findUnique({
      where: { id },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!template) throw new NotFoundException("Shablon topilmadi");
    return this.withDerived(template);
  }

  async create(dto: CreateShiftTemplateDto) {
    const dept = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
      select: { id: true },
    });
    if (!dept) throw new NotFoundException("Bo'lim topilmadi");
    this.assertNonZeroDuration(dto.startTime, dto.endTime);

    const template = await this.prisma.shiftTemplate.create({
      data: {
        departmentId: dto.departmentId,
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        requiredDoctors: dto.requiredDoctors ?? 1,
        requiredNurses: dto.requiredNurses ?? 1,
        daysOfWeek: dto.daysOfWeek ?? [],
      },
      include: { department: { select: { id: true, name: true } } },
    });
    return this.withDerived(template);
  }

  async update(id: string, dto: UpdateShiftTemplateDto) {
    const existing = await this.prisma.shiftTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Shablon topilmadi");

    this.assertNonZeroDuration(dto.startTime ?? existing.startTime, dto.endTime ?? existing.endTime);

    const template = await this.prisma.shiftTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        requiredDoctors: dto.requiredDoctors,
        requiredNurses: dto.requiredNurses,
        daysOfWeek: dto.daysOfWeek,
        isActive: dto.isActive,
      },
      include: { department: { select: { id: true, name: true } } },
    });
    return this.withDerived(template);
  }

  async delete(id: string) {
    const existing = await this.prisma.shiftTemplate.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException("Shablon topilmadi");
    await this.prisma.shiftTemplate.delete({ where: { id } });
    return { message: "Shablon o'chirildi" };
  }

  /**
   * Bir xil boshlanish va tugash vaqti 24 soatlik smena degani emas, balki
   * odatda xato — shuning uchun taqiqlanadi.
   */
  private assertNonZeroDuration(startTime: string, endTime: string) {
    if (startTime === endTime) {
      throw new BadRequestException("Boshlanish va tugash vaqti bir xil bo'lmasligi kerak");
    }
  }

  /** UI uchun: smena yarim tundan o'tadimi. */
  private withDerived<T extends { startTime: string; endTime: string }>(template: T) {
    return { ...template, crossesMidnight: crossesMidnight(template) };
  }
}
