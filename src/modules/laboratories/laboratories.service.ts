import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateLaboratoryDto, CreateLaboratoryServiceDto, UpdateLaboratoryDto, UpdateLaboratoryServiceDto } from "./laboratories.dto";
import { LaboratoriesRepository } from "./laboratories.repository";

@Injectable()
export class LaboratoriesService {
  constructor(private readonly repo: LaboratoriesRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    const lab = await this.repo.findById(id);
    if (!lab) throw new NotFoundException("Laboratory not found");
    return lab;
  }

  create(dto: CreateLaboratoryDto) {
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateLaboratoryDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    const labOrdersCount = await this.repo.countLabOrders(id);
    if (labOrdersCount > 0) {
      throw new BadRequestException(`Laboratoriyani o'chirib bo'lmaydi: ${labOrdersCount} ta tahlil natijasi mavjud`);
    }
    return this.repo.delete(id);
  }

  async createService(labId: string, dto: CreateLaboratoryServiceDto) {
    await this.findById(labId);
    return this.repo.createService(labId, dto);
  }

  updateService(serviceId: string, dto: UpdateLaboratoryServiceDto) {
    return this.repo.updateService(serviceId, dto);
  }

  deleteService(serviceId: string) {
    return this.repo.deleteService(serviceId);
  }
}
