import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OperationTypesRepository } from './operation-types.repository';
import { CreateOperationTypeDto, UpdateOperationTypeDto } from './operation-type.dto';

@Injectable()
export class OperationTypesService {
  constructor(private readonly repo: OperationTypesRepository) {}

  findAll(onlyActive?: boolean) {
    return this.repo.findAll(onlyActive);
  }

  async findOne(id: string) {
    const type = await this.repo.findOne(id);
    if (!type) throw new NotFoundException(`OperationType ${id} topilmadi`);
    return type;
  }

  create(dto: CreateOperationTypeDto) {
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateOperationTypeDto) {
    await this.findOne(id);
    return this.repo.update(id, dto);
  }

  async remove(id: string) {
    const type = await this.repo.findOne(id);
    if (!type) throw new NotFoundException(`OperationType ${id} topilmadi`);

    if (type._count.operations > 0) {
      throw new BadRequestException(
        `Bu operatsiya turiga ${type._count.operations} ta operatsiya bog'liq. O'chirib bo'lmaydi.`,
      );
    }

    return this.repo.delete(id);
  }

  async removeItem(itemId: string) {
    return this.repo.deleteItem(itemId);
  }
}