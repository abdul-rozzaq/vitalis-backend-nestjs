import { Injectable, NotFoundException } from "@nestjs/common";
import { MedicalCardsRepository } from "./medical-cards.repository";
import { CreateMedicalCard003Dto, UpdateMedicalCard003Dto } from "./medical-cards.dto";

@Injectable()
export class MedicalCardsService {
  constructor(private readonly repository: MedicalCardsRepository) {}

  create(dto: CreateMedicalCard003Dto) {
    const { patientId, admissionDate, dischargeDate, dailyNotes, ...rest } = dto;
    return this.repository.create({
      patient: { connect: { id: patientId } },
      admissionDate: new Date(admissionDate),
      dischargeDate: dischargeDate ? new Date(dischargeDate) : null,
      dailyNotes: (dailyNotes ?? []) as any,
      ...rest,
    });
  }

  async findById(id: string) {
    const card = await this.repository.findById(id);
    if (!card) throw new NotFoundException(`MedicalCard003 ${id} not found`);
    return card;
  }

  findByPatientId(patientId: string) {
    return this.repository.findByPatientId(patientId);
  }

  async update(id: string, dto: UpdateMedicalCard003Dto) {
    await this.findById(id);
    const { admissionDate, dischargeDate, dailyNotes, ...rest } = dto;
    return this.repository.update(id, {
      ...(admissionDate ? { admissionDate: new Date(admissionDate) } : {}),
      ...(dischargeDate !== undefined ? { dischargeDate: dischargeDate ? new Date(dischargeDate) : null } : {}),
      ...(dailyNotes !== undefined ? { dailyNotes: dailyNotes as any } : {}),
      ...rest,
    });
  }
}
