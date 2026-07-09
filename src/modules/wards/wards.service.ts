import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WardStatus } from "../../generated/prisma/client";
import { BonusTxSource } from "../../generated/prisma/enums";
import { RoleName } from "../../common/enums/role-name.enum";
import { PrismaService } from "../../prisma/prisma.service";
import { BalanceService } from "../balance/balance.service";
import { ShiftsService } from "../shifts/shifts.service";
import { CheckOutDto, CreateWardDto, UpdateWardDto, WardQueryDto } from "./wards.dto";
import { WardsRepository } from "./wards.repository";

@Injectable()
export class WardsService {
  constructor(
    private readonly repository: WardsRepository,
    private readonly shiftsService: ShiftsService,
    private readonly prisma: PrismaService,
    private readonly balanceService: BalanceService,
  ) {}

  private async assertOnDuty(userId: string, roomId: string, userRole: RoleName) {
    if (userRole === RoleName.ADMIN || userRole === RoleName.DIREKTOR) return;
    await this.shiftsService.assertUserOnDutyForRoom(userId, roomId);
  }

  // Bemorni palataga yotqizish
  async checkIn(dto: CreateWardDto, userId: string, userRole: RoleName) {
    await this.assertOnDuty(userId, dto.roomId, userRole);

    // Existing patient-in-ward check
    const existing = await this.repository.findActiveByPatient(dto.patientId);
    if (existing) {
      throw new BadRequestException(
        `Bu bemor allaqachon "${existing.room.name}" xonasida yotibdi.`,
      );
    }

    // Existing occupancy check
    const occupancy = await this.repository.roomOccupancy(dto.roomId);
    if (!occupancy.room) throw new NotFoundException("Xona topilmadi");

    // Rule: Room must have a department (prices cannot be determined without it)
    if (!occupancy.room.departmentId) {
      throw new BadRequestException(
        "Tanlangan xona hech qanday bo'limga biriktirilmagan. Narxlarni aniqlash mumkin emas.",
      );
    }

    const newPeopleCount = 1 + (dto.companionsCount ?? 0);
    if (occupancy.free < newPeopleCount) {
      throw new BadRequestException(
        `"${occupancy.room.name}" xonasida ${occupancy.free} ta bo'sh o'rin bor, ` +
          `siz ${newPeopleCount} ta so'rayapsiz`,
      );
    }

    // Fetch department to get default prices
    const department = await this.prisma.department.findUnique({
      where: { id: occupancy.room.departmentId },
    });

    // Resolve snapshot prices — operator override wins over department defaults
    const patientPricePerDay: Prisma.Decimal | null =
      dto.patientPricePerDay != null
        ? new Prisma.Decimal(dto.patientPricePerDay)
        : department?.patientDailyPrice ?? null;

    const companionPricePerDay: Prisma.Decimal | null =
      dto.companionPricePerDay != null
        ? new Prisma.Decimal(dto.companionPricePerDay)
        : department?.companionDailyPrice ?? null;

    // Atomic: ward creation + optional bonus grant in ONE transaction
    return this.prisma.$transaction(async (tx) => {
      const ward = await this.repository.createInTx(tx, {
        patientId: dto.patientId,
        roomId: dto.roomId,
        checkIn: dto.checkIn,
        expectedOut: dto.expectedOut,
        note: dto.note,
        companionsCount: dto.companionsCount,
        patientPricePerDay,
        companionPricePerDay,
      });

      // Free days → accommodation bonus (only if freeDays > 0 and patient price is known)
      // Formula: Bonus = patientPricePerDay × freeDays (companion NOT included)
      if (dto.freeDays && dto.freeDays > 0 && patientPricePerDay) {
        const bonusAmount = patientPricePerDay.mul(dto.freeDays);
        await this.balanceService.earnBonusInTx(tx, {
          patientId: dto.patientId,
          amount: bonusAmount,
          source: BonusTxSource.ACCOMMODATION,
          note: `Bepul ${dto.freeDays} kun yotoqxona bonusi (${ward.room.name})`,
          staffId: userId,
        });
      }

      return ward;
    });
  }

  // Hozir yotayotgan barcha bemorlar
  async getAllOccupied() {
    return this.repository.findAllOccupied();
  }

  // TV board: minimal public ma'lumot (xona nomi + bemor ismi, PII yo'q)
  async getBoard() {
    return this.repository.findBoard();
  }

  // Barcha yozuvlar — filter + pagination
  async getAll(query: WardQueryDto) {
    return this.repository.findAll({
      patientId: query.patientId,
      roomId: query.roomId,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  // Bitta yozuv
  async getById(id: string) {
    const ward = await this.repository.findById(id);
    if (!ward) throw new NotFoundException("Palata yozuvi topilmadi");
    return ward;
  }

  // Xonadagi bemorlar
  async getByRoom(roomId: string) {
    return this.repository.findByRoom(roomId);
  }

  // Xona sig'imi statistikasi
  async roomOccupancy(roomId: string) {
    return this.repository.roomOccupancy(roomId);
  }

  // Umumiy statistika
  async getStats() {
    return this.repository.getStats();
  }

  // Bemorni chiqarish
  async checkOut(id: string, dto: CheckOutDto, userId: string, userRole: RoleName) {
    const ward = await this.repository.findById(id);
    if (!ward) throw new NotFoundException("Palata yozuvi topilmadi");

    if (ward.status === WardStatus.VACATED) {
      throw new BadRequestException("Bu bemor allaqachon chiqib ketgan");
    }

    await this.assertOnDuty(userId, ward.room.id, userRole);

    const outDate = dto.actualOut ? new Date(dto.actualOut) : new Date();
    const inDate = new Date(ward.checkIn);

    const diffMs = outDate.getTime() - inDate.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1;

    return this.repository.discharge(id, outDate, days, dto.note);
  }

  // Yozuvni tahrirlash
  async update(id: string, dto: UpdateWardDto) {
    const ward = await this.repository.findById(id);
    if (!ward) throw new NotFoundException("Palata yozuvi topilmadi");

    // Agar roomId o'zgartirilsa — yangi xona sig'imini tekshir
    if (dto.roomId && dto.roomId !== ward.room.id) {
      const occupancy = await this.repository.roomOccupancy(dto.roomId);
      if (!occupancy.room) throw new NotFoundException("Yangi xona topilmadi");
      if (occupancy.free <= 0) {
        throw new BadRequestException(
          `"${occupancy.room.name}" xonasi to'lgan (${occupancy.capacity}/${occupancy.capacity} o'rin band)`,
        );
      }
    }

    // Agar patientId o'zgartirilsa — yangi bemor allaqachon yotayotganmi?
    if (dto.patientId && dto.patientId !== ward.patient.id) {
      const existing = await this.repository.findActiveByPatient(dto.patientId);
      if (existing) {
        throw new BadRequestException(
          `Bu bemor allaqachon "${existing.room.name}" xonasida yotibdi.`,
        );
      }
    }

    return this.repository.update(id, dto);
  }

  // O'chirish (faqat ADMIN)
  async delete(id: string) {
    const ward = await this.repository.findById(id);
    if (!ward) throw new NotFoundException("Palata yozuvi topilmadi");
    return this.repository.delete(id);
  }
}
