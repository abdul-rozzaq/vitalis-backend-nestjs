import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { clinicDayUTC } from "../../common/clinic-time";
import { ShiftEventsQueryDto } from "./shift-events.dto";

const STAFF_SELECT = { id: true, first_name: true, last_name: true };

@Injectable()
export class ShiftEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ShiftEventsQueryDto) {
    const from = query.from ? clinicDayUTC(query.from) : undefined;
    const to = query.to ? clinicDayUTC(query.to) : undefined;

    return this.prisma.shiftChangeEvent.findMany({
      where: {
        ...(query.userId && {
          OR: [{ fromDoctorId: query.userId }, { toDoctorId: query.userId }, { requestedById: query.userId }],
        }),
        ...(from && { date: { gte: from } }),
        ...(to && { date: { lte: to } }),
        ...(query.type && { eventType: query.type }),
      },
      include: {
        fromDoctor: { select: STAFF_SELECT },
        toDoctor: { select: STAFF_SELECT },
        requestedBy: { select: STAFF_SELECT },
        roomShift: { select: { id: true, name: true, startHour: true, endHour: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async findByAssignment(assignmentId: string) {
    return this.prisma.shiftChangeEvent.findMany({
      where: { shiftAssignmentId: assignmentId },
      include: {
        fromDoctor: { select: STAFF_SELECT },
        toDoctor: { select: STAFF_SELECT },
        requestedBy: { select: STAFF_SELECT },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
