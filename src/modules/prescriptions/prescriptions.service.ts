import { Injectable, NotFoundException } from "@nestjs/common";
import QRCode from "qrcode";
import { PrescriptionsRepository } from "./prescriptions.repository";
import { UpsertPrescriptionDto } from "./prescriptions.dto";
import { mapPrescriptionToPrintableDocument } from "./prescription-print.mapper";
import { renderPrescriptionPrintTemplate } from "./prescription-print.template";

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

  async generatePrintableHtml(id: string) {
    const prescription = await this.repository.findByIdForPrint(id);

    if (!prescription) {
      throw new NotFoundException("Prescription not found");
    }

    const verifyBaseUrl = process.env.PRESCRIPTION_VERIFY_BASE_URL || `${process.env.FRONTEND_BASE_URL || "http://localhost:3000"}/verify/prescriptions`;

    const printable = mapPrescriptionToPrintableDocument(prescription, {
      clinicName: process.env.CLINIC_NAME || "Vitalis Medical Center",
      clinicLogoUrl: process.env.CLINIC_LOGO_URL,
      clinicAddress: process.env.CLINIC_ADDRESS,
      clinicPhone: process.env.CLINIC_PHONE,
      verifyBaseUrl,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(printable.metadata.verificationUrl || printable.metadata.prescriptionId, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 132,
    });

    return renderPrescriptionPrintTemplate({
      ...printable,
      qrCodeDataUrl,
    });
  }
}
