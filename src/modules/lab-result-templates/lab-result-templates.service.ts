import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateLabResultTemplateDto, UpdateLabResultTemplateDto } from "./lab-result-templates.dto";
import { LabResultTemplatesRepository } from "./lab-result-templates.repository";

@Injectable()
export class LabResultTemplatesService {
  constructor(private readonly repo: LabResultTemplatesRepository) {}

  findAllSummary() {
    return this.repo.findAllSummary();
  }

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    const template = await this.repo.findById(id);
    if (!template) throw new NotFoundException("Natija shabloni topilmadi");
    return template;
  }

  create(dto: CreateLabResultTemplateDto) {
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateLabResultTemplateDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
