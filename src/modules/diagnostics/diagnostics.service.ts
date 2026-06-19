import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateDiagnosticsDto,
  CreateDiagnosticServiceDto,
  UpdateDiagnosticsDto,
  UpdateDiagnosticServiceDto,
} from "./diagnostics.dto";
import { DiagnosticsRepository } from "./diagnostics.repository";

@Injectable()
export class DiagnosticsService {
  constructor(private readonly repo: DiagnosticsRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    const d = await this.repo.findById(id);
    if (!d) throw new NotFoundException("Diagnostics center not found");
    return d;
  }

  create(dto: CreateDiagnosticsDto) {
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateDiagnosticsDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    const ordersCount = await this.repo.countDiagnosticOrders(id);
    if (ordersCount > 0) {
      throw new BadRequestException(
        `Diagnostika markazini o'chirib bo'lmaydi: ${ordersCount} ta buyurtma mavjud`,
      );
    }
    return this.repo.delete(id);
  }

  async createService(diagnosticsId: string, dto: CreateDiagnosticServiceDto) {
    await this.findById(diagnosticsId);
    return this.repo.createService(diagnosticsId, dto);
  }

  updateService(serviceId: string, dto: UpdateDiagnosticServiceDto) {
    return this.repo.updateService(serviceId, dto);
  }

  deleteService(serviceId: string) {
    return this.repo.deleteService(serviceId);
  }
}
