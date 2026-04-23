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

  async findById(id: string, userId: string, isDoctor: boolean) {
    const card = await this.repository.findById(id, userId, isDoctor);
    if (!card) throw new NotFoundException(`MedicalCard003 ${id} not found`);
    return card;
  }

  findByPatientId(patientId: string, userId: string, isDoctor: boolean) {
    return this.repository.findByPatientId(patientId, userId, isDoctor);
  }

  async update(id: string, dto: UpdateMedicalCard003Dto, userId: string, isDoctor: boolean) {
    await this.findById(id, userId, isDoctor);
    const { admissionDate, dischargeDate, dailyNotes, ...rest } = dto;
    return this.repository.update(id, {
      ...(admissionDate ? { admissionDate: new Date(admissionDate) } : {}),
      ...(dischargeDate !== undefined ? { dischargeDate: dischargeDate ? new Date(dischargeDate) : null } : {}),
      ...(dailyNotes !== undefined ? { dailyNotes: dailyNotes as any } : {}),
      ...rest,
    });
  }
}
