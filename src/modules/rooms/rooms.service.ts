import { Injectable } from '@nestjs/common';
import { RoomsRepository } from './rooms.repository';
import { AppException } from '../../common/exceptions/app.exception';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class RoomsService {
  constructor(private readonly repo: RoomsRepository) {}

  async list() {
    return this.repo.list();
  }

  async retrieve(id: string) {
    const room = await this.repo.retrieve(id);
    if (!room) throw new AppException('Room not found', 404);
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
