import { Injectable } from '@nestjs/common';
import { RegionsRepository } from './regions.repository';
import { CreateRegionDto, UpdateRegionDto } from './regions.dto';

@Injectable()
export class RegionsService {
  constructor(private readonly repository: RegionsRepository) {}

  list() {
    return this.repository.list();
  }

  retrieve(id: string) {
    return this.repository.retrieve(id);
  }

  create(dto: CreateRegionDto) {
    return this.repository.create(dto);
  }

  update(id: string, dto: UpdateRegionDto) {
    return this.repository.update(id, dto);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
