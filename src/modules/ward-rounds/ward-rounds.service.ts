import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ShiftAssignmentsService } from "../shift-assignments/shift-assignments.service";
import { CompleteWardRoundDto, CreateWardRoundDto } from "./ward-rounds.dto";

const PATIENT_SELECT = { id: true, first_name: true, last_name: true };

@Injectable()
export class WardRoundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shiftAssignmentsService: ShiftAssignmentsService,
  ) {}

  async create(dto: CreateWardRoundDto, userId: string) {
    // Verify the user is the doctor for this assignment
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: dto.shiftAssignmentId },
      include: { nurses: true },
    });

    // If no concrete assignment, check via recurring rule
    let assignmentId = dto.shiftAssignmentId;

    if (!assignment) {
      throw new NotFoundException("Tayinlov topilmadi");
    } else {
      const isDoctor = assignment.doctorId === userId;
      const isNurse = assignment.nurses.some((n) => n.nurseId === userId);
      if (!isDoctor && !isNurse) throw new ForbiddenException("Siz bu smena uchun apoxot yarata olmaysiz");
    }

    return this.prisma.wardRound.create({
      data: {
        shiftAssignmentId: assignmentId,
        scheduledAt: new Date(),
        notes: dto.notes,
      },
      include: {
        shiftAssignment: {
          include: {
            roomShift: { include: { rooms: { include: { room: { select: { id: true, name: true } } } } } },
            doctor: { select: PATIENT_SELECT },
          },
        },
        patientNotes: { include: { patient: { select: PATIENT_SELECT } } },
      },
    });
  }

  async findByAssignment(shiftAssignmentId: string) {
    return this.prisma.wardRound.findMany({
      where: { shiftAssignmentId },
      include: {
        patientNotes: { include: { patient: { select: PATIENT_SELECT } } },
      },
      orderBy: { scheduledAt: "desc" },
    });
  }

  async findById(id: string) {
    const round = await this.prisma.wardRound.findUnique({
      where: { id },
      include: {
        shiftAssignment: {
          include: {
            roomShift: { include: { rooms: { include: { room: { select: { id: true, name: true } } } } } },
            doctor: { select: PATIENT_SELECT },
            nurses: { include: { nurse: { select: PATIENT_SELECT } } },
          },
        },
        patientNotes: { include: { patient: { select: PATIENT_SELECT } } },
      },
    });
    if (!round) throw new NotFoundException("Apoxot topilmadi");
    return round;
  }

  async complete(id: string, dto: CompleteWardRoundDto, userId: string) {
    const round = await this.prisma.wardRound.findUnique({
      where: { id },
      include: { shiftAssignment: { include: { nurses: true } } },
    });
    if (!round) throw new NotFoundException("Apoxot topilmadi");
    if (round.completedAt) throw new ForbiddenException("Apoxot allaqachon yakunlangan");

    const isDoctor = round.shiftAssignment.doctorId === userId;
    const isNurse = round.shiftAssignment.nurses.some((n) => n.nurseId === userId);
    if (!isDoctor && !isNurse) throw new ForbiddenException("Siz bu apoxotni yakunlay olmaysiz");

    return this.prisma.$transaction(async (tx) => {
      // Delete old patient notes if any
      await tx.wardRoundPatient.deleteMany({ where: { roundId: id } });

      // Create new patient status records
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
        include: {
          patientNotes: { include: { patient: { select: PATIENT_SELECT } } },
        },
      });
    });
  }
}
