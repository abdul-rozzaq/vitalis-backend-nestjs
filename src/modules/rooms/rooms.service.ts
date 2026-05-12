import { Injectable } from "@nestjs/common";
import { AppException } from "../../common/exceptions/app.exception";
import { RoomsRepository } from "./rooms.repository";
import { CreateRoomDto, UpdateRoomDto } from "./rooms.dto";

@Injectable()
export class RoomsService {
  constructor(private readonly repo: RoomsRepository) {}

  // Barcha xonalar (occupancy bilan)
  async list() {
    return this.repo.list();
  }

  // Faqat WARD tipli xonalar — check-in modal uchun
  async listWards() {
    return this.repo.listWards();
  }

  async retrieve(id: string) {
    const room = await this.repo.retrieve(id);
    if (!room) throw new AppException("Room not found", 404);
    return room;
  }

  async create(dto: CreateRoomDto) {
    const { departmentId, ...rest } = dto;
    return this.repo.create({
      ...rest,
      ...(departmentId ? { department: { connect: { id: departmentId } } } : {}),
    } as any);
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.retrieve(id);
    const { departmentId, ...rest } = dto;
    return this.repo.update(id, {
      ...rest,
      ...(departmentId === null
        ? { department: { disconnect: true } }
        : departmentId
          ? { department: { connect: { id: departmentId } } }
          : {}),
    } as any);
  }

  async delete(id: string) {
    await this.retrieve(id);
    return this.repo.delete(id);
  }
}
