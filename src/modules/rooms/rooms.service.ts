import { Injectable } from "@nestjs/common";
import { AppException } from "../../common/exceptions/app.exception";
import { Prisma } from "../../generated/prisma/client";
import { RoomsRepository } from "./rooms.repository";

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

  async create(data: Prisma.RoomCreateInput) {
    return this.repo.create(data);
  }

  async update(id: string, data: Prisma.RoomUpdateInput) {
    await this.retrieve(id);
    return this.repo.update(id, data);
  }

  async delete(id: string) {
    await this.retrieve(id);
    return this.repo.delete(id);
  }
}
