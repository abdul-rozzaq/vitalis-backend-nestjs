import { Injectable, NotFoundException } from "@nestjs/common";
import QRCode from "qrcode";
import { PrescriptionPrintDocument } from "./prescription-print.mapper";
import { renderPrescriptionPrintTemplate } from "./prescription-print.template";
import { UpsertPrescriptionDto } from "./prescriptions.dto";
import { PrescriptionsRepository } from "./prescriptions.repository";

type PrescriptionForPrint = Awaited<ReturnType<PrescriptionsRepository["findByIdForPrint"]>>;

const mealRelationLabels = {
  BEFORE_MEAL: "Before meal",
  AFTER_MEAL: "After meal",
  WITH_MEAL: "With meal",
  AT_SPECIFIC_TIME: "At specific time",
} as const;

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

  private sanitizePrintableContent(value: string | null | undefined): string {
    if (!value) return "";

    return value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private formatPrintDate(value: Date | string | null | undefined, locale = "en-GB"): string {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  }

  private formatDuration(startDate: Date, endDate: Date): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayMs = 1000 * 60 * 60 * 24;
    const diff = Math.max(0, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);

    if (diff <= 1) return "1 day";
    return `${diff} days`;
  }

  private buildPrintableDocument(prescription: NonNullable<PrescriptionForPrint>, verifyBaseUrl: string): Omit<PrescriptionPrintDocument, "qrCodeDataUrl"> {
    const patient = prescription.appointment.patient;
    const doctor = prescription.appointment.assignment.user;
    const issueAt = prescription.updatedAt || prescription.createdAt;
    const verificationUrl = `${verifyBaseUrl.replace(/\/$/, "")}/${prescription.id}`;

    return {
      clinic: {
        name: this.sanitizePrintableContent(process.env.CLINIC_NAME || "Euromed Clinic"),
        logoUrl: this.sanitizePrintableContent(process.env.CLINIC_LOGO_URL),
        address: this.sanitizePrintableContent(process.env.CLINIC_ADDRESS),
        phone: this.sanitizePrintableContent(process.env.CLINIC_PHONE),
      },
      doctor: {
        fullName: `Dr. ${this.sanitizePrintableContent(doctor.first_name)} ${this.sanitizePrintableContent(doctor.last_name)}`,
        specialization: this.sanitizePrintableContent(prescription.appointment.assignment.department?.name),
        signaturePlaceholder: "______________________________",
      },
      patient: {
        fullName: `${this.sanitizePrintableContent(patient.first_name)} ${this.sanitizePrintableContent(patient.last_name)}`,
      },
      metadata: {
        prescriptionId: this.sanitizePrintableContent(prescription.id),
        issueDate: this.formatPrintDate(issueAt),
        issueDateIso: issueAt.toISOString(),
        verificationUrl: this.sanitizePrintableContent(verificationUrl),
      },
      medications: prescription.items.map((item) => {
        const relationLabel = mealRelationLabels[item.mealRelation] || item.mealRelation;
        const specificTime = item.mealRelation === "AT_SPECIFIC_TIME" && item.specificTime ? ` (${item.specificTime})` : "";
        const note = item.note?.trim();
        const instructions = `${relationLabel}${specificTime}${note ? ` • ${note}` : ""}`;

        return {
          drugName: this.sanitizePrintableContent(item.medicine.name),
          dosage: this.sanitizePrintableContent(item.dosage),
          frequency: `${item.frequency}x / day`,
          duration: `${this.formatPrintDate(item.startDate)} - ${this.formatPrintDate(item.endDate)} (${this.formatDuration(item.startDate, item.endDate)})`,
          instructions: this.sanitizePrintableContent(instructions),
        };
      }),
    };
  }

  async generatePrintableHtml(id: string) {
    const prescription = await this.repository.findByIdForPrint(id);

    if (!prescription) {
      throw new NotFoundException("Prescription not found");
    }

    const verifyBaseUrl = process.env.PRESCRIPTION_VERIFY_BASE_URL || `${process.env.FRONTEND_BASE_URL || "http://localhost:3000"}/verify/prescriptions`;

    const printable = this.buildPrintableDocument(prescription, verifyBaseUrl);

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
