import { Injectable } from "@nestjs/common";
import { PrescriptionsRepository } from "./prescriptions.repository";
import { UpsertPrescriptionDto } from "./prescriptions.dto";

@Injectable()
export class PrescriptionsService {
  constructor(private readonly repository: PrescriptionsRepository) {}

  getByAppointment(appointmentId: string) {
    return this.repository.findByAppointmentId(appointmentId);
  }

  upsert(dto: UpsertPrescriptionDto) {
    return this.repository.upsert(dto.appointmentId, dto.items);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
