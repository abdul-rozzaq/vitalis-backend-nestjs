import { Injectable } from '@nestjs/common';
import { DistrictsRepository } from './districts.repository';
import { CreateDistrictDto, UpdateDistrictDto } from './districts.dto';

@Injectable()
export class DistrictsService {
  constructor(private readonly repository: DistrictsRepository) {}

  list(regionId?: string) {
    return this.repository.list(regionId);
  }

  retrieve(id: string) {
    return this.repository.retrieve(id);
  }

  create(dto: CreateDistrictDto) {
    return this.repository.create({
      name: dto.name,
      region: { connect: { id: dto.regionId } },
    });
  }

  update(id: string, dto: UpdateDistrictDto) {
    const { regionId, ...rest } = dto;
    return this.repository.update(id, {
      ...rest,
      ...(regionId ? { region: { connect: { id: regionId } } } : {}),
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
