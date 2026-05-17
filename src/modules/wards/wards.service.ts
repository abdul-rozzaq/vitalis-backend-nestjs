import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { WardStatus } from "../../generated/prisma/client";
import { CheckOutDto, CreateWardDto, UpdateWardDto, WardQueryDto } from "./wards.dto";
import { WardsRepository } from "./wards.repository";

@Injectable()
export class WardsService {
  constructor(private readonly repository: WardsRepository) {}

  // Bemorni palataga yotqizish
  async checkIn(dto: CreateWardDto) {
    const existing = await this.repository.findActiveByPatient(dto.patientId);
    if (existing) {
      throw new BadRequestException(`Bu bemor allaqachon "${existing.room.name}" xonasida yotibdi.`);
    }
    const occupancy = await this.repository.roomOccupancy(dto.roomId);
    if (!occupancy.room) throw new NotFoundException("Xona topilmadi");
    const newPeopleCount = 1 + (dto.companionsCount ?? 0);
    if (occupancy.free < newPeopleCount) {
      throw new BadRequestException(`"${occupancy.room.name}" xonasida ${occupancy.free} ta bo'sh o'rin bor, siz ${newPeopleCount} ta so'rayapsiz`);
    }

    return this.repository.create(dto);
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
  async checkOut(id: string, dto: CheckOutDto) {
    const ward = await this.repository.findById(id);
    if (!ward) throw new NotFoundException("Palata yozuvi topilmadi");

    if (ward.status === WardStatus.VACATED) {
      throw new BadRequestException("Bu bemor allaqachon chiqib ketgan");
    }

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
      // ← QO'SHILDI
      const occupancy = await this.repository.roomOccupancy(dto.roomId);
      if (!occupancy.room) throw new NotFoundException("Yangi xona topilmadi");
      if (occupancy.free <= 0) {
        throw new BadRequestException(`"${occupancy.room.name}" xonasi to'lgan (${occupancy.capacity}/${occupancy.capacity} o'rin band)`);
      }
    }

    // Agar patientId o'zgartirilsa — yangi bemor allaqachon yotayotganmi?
    if (dto.patientId && dto.patientId !== ward.patient.id) {
      // ← QO'SHILDI
      const existing = await this.repository.findActiveByPatient(dto.patientId);
      if (existing) {
        throw new BadRequestException(`Bu bemor allaqachon "${existing.room.name}" xonasida yotibdi.`);
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
