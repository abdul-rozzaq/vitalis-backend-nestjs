import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CompleteWardRoundDto, CreateWardRoundDto } from "./ward-rounds.dto";

const PATIENT_SELECT = { id: true, first_name: true, last_name: true };

const ROUND_INCLUDE = {
  shift: { include: { department: { select: { id: true, name: true } } } },
  patientNotes: { include: { patient: { select: PATIENT_SELECT } } },
} as const;

@Injectable()
export class WardRoundsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWardRoundDto, userId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
      include: { staff: { select: { userId: true } } },
    });
    if (!shift) throw new NotFoundException("Smena topilmadi");

    const isStaff = shift.staff.some((s) => s.userId === userId);
    if (!isStaff) throw new ForbiddenException("Siz bu smena uchun obhod yarata olmaysiz");

    return this.prisma.wardRound.create({
      data: {
        shiftId: dto.shiftId,
        scheduledAt: new Date(),
        notes: dto.notes,
      },
      include: ROUND_INCLUDE,
    });
  }

  async findByShift(shiftId: string) {
    return this.prisma.wardRound.findMany({
      where: { shiftId },
      include: { patientNotes: { include: { patient: { select: PATIENT_SELECT } } } },
      orderBy: { scheduledAt: "desc" },
    });
  }

  async findById(id: string) {
    const round = await this.prisma.wardRound.findUnique({ where: { id }, include: ROUND_INCLUDE });
    if (!round) throw new NotFoundException("Obhod topilmadi");
    return round;
  }

  async complete(id: string, dto: CompleteWardRoundDto, userId: string) {
    const round = await this.prisma.wardRound.findUnique({
      where: { id },
      include: { shift: { include: { staff: { select: { userId: true } } } } },
    });
    if (!round) throw new NotFoundException("Obhod topilmadi");
    if (round.completedAt) throw new ForbiddenException("Obhod allaqachon yakunlangan");

    const isStaff = round.shift.staff.some((s) => s.userId === userId);
    if (!isStaff) throw new ForbiddenException("Siz bu obhodni yakunlay olmaysiz");

    return this.prisma.$transaction(async (tx) => {
      await tx.wardRoundPatient.deleteMany({ where: { roundId: id } });

      if (dto.patients.length > 0) {
        await tx.wardRoundPatient.createMany({
          data: dto.patients.map((p) => ({
            roundId: id,
            patientId: p.patientId,
            condition: p.condition,
            notes: p.notes,
          })),
        });
      }

      return tx.wardRound.update({
        where: { id },
        data: { completedAt: new Date(), notes: dto.notes ?? round.notes },
        include: { patientNotes: { include: { patient: { select: PATIENT_SELECT } } } },
      });
    });
  }
}
