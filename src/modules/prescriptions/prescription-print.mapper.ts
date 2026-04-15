import { calculateAge, formatPrintDate, sanitizePrintableContent } from "./prescription-print.utils";

const mealRelationLabels: Record<PrescriptionForPrint["items"][number]["mealRelation"], string> = {
  BEFORE_MEAL: "Before meal",
  AFTER_MEAL: "After meal",
  WITH_MEAL: "With meal",
  AT_SPECIFIC_TIME: "At specific time",
};

function formatDuration(startDate: Date, endDate: Date): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dayMs = 1000 * 60 * 60 * 24;
  const diff = Math.max(0, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);

  if (diff <= 1) return "1 day";
  return `${diff} days`;
}

function resolvePatientIdentifier(patient: PrescriptionForPrint["appointment"]["patient"]): string | undefined {
  if (patient.pinfl) return patient.pinfl;

  const doc = [patient.document_series, patient.document_number].filter(Boolean).join(" ").trim();
  if (doc) return doc;

  return patient.id;
}

export function mapPrescriptionToPrintableDocument(prescription: PrescriptionForPrint, ctx: MapperContext): Omit<PrescriptionPrintDocument, "qrCodeDataUrl"> {
  const patient = prescription.appointment.patient;
  const doctor = prescription.appointment.assignment.user;
  const verificationUrl = `${ctx.verifyBaseUrl.replace(/\/$/, "")}/${prescription.id}`;

  const diagnosis = sanitizePrintableContent(ctx.diagnosis);
  const notes = sanitizePrintableContent(ctx.notes);

  return {
    clinic: {
      name: sanitizePrintableContent(ctx.clinicName),
      logoUrl: sanitizePrintableContent(ctx.clinicLogoUrl),
      address: sanitizePrintableContent(ctx.clinicAddress),
      phone: sanitizePrintableContent(ctx.clinicPhone),
    },
    doctor: {
      fullName: `Dr. ${sanitizePrintableContent(doctor.first_name)} ${sanitizePrintableContent(doctor.last_name)}`,
      specialization: sanitizePrintableContent(prescription.appointment.assignment.department?.name),
      signaturePlaceholder: "______________________________",
    },
    patient: {
      fullName: `${sanitizePrintableContent(patient.first_name)} ${sanitizePrintableContent(patient.last_name)}`,
      age: calculateAge(patient.birth_date),
      gender: sanitizePrintableContent(patient.gender),
      phone: sanitizePrintableContent(patient.phone_number),
      identifier: sanitizePrintableContent(resolvePatientIdentifier(patient)),
    },
    metadata: {
      prescriptionId: sanitizePrintableContent(prescription.id),
      issueDate: formatPrintDate(prescription.updatedAt || prescription.createdAt),
      issueDateIso: (prescription.updatedAt || prescription.createdAt).toISOString(),
      verificationUrl: sanitizePrintableContent(verificationUrl),
    },
    medications: prescription.items.map((item) => {
      const relationLabel = mealRelationLabels[item.mealRelation] || item.mealRelation;
      const specificTime = item.mealRelation === "AT_SPECIFIC_TIME" && item.specificTime ? ` (${item.specificTime})` : "";
      const note = item.note?.trim();
      const instructions = `${relationLabel}${specificTime}${note ? ` • ${note}` : ""}`;

      return {
        drugName: sanitizePrintableContent(item.medicine.name),
        dosage: sanitizePrintableContent(item.dosage),
        frequency: `${item.frequency}x / day`,
        duration: `${formatPrintDate(item.startDate)} - ${formatPrintDate(item.endDate)} (${formatDuration(item.startDate, item.endDate)})`,
        instructions: sanitizePrintableContent(instructions),
      };
    }),
    diagnosis: diagnosis || undefined,
    notes: notes || undefined,
    referrals: [
      { key: "lab-referral", title: "Lab Referral", content: "" },
      { key: "imaging-referral", title: "Imaging Referral", content: "" },
    ],
  };
}

export type PrescriptionPrintClinicInfo = {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
};

export type PrescriptionPrintDoctorInfo = {
  fullName: string;
  specialization?: string;
  signaturePlaceholder: string;
};

export type PrescriptionPrintPatientInfo = {
  fullName: string;
  age?: number;
  gender?: string;
  phone?: string;
  identifier?: string;
};

export type PrescriptionPrintMedication = {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
};

export type PrescriptionPrintReferralSection = {
  key: string;
  title: string;
  content?: string;
};

export type PrescriptionPrintDocument = {
  clinic: PrescriptionPrintClinicInfo;
  doctor: PrescriptionPrintDoctorInfo;
  patient: PrescriptionPrintPatientInfo;
  metadata: {
    prescriptionId: string;
    issueDate: string;
    issueDateIso: string;
    verificationUrl: string;
  };
  medications: PrescriptionPrintMedication[];
  diagnosis?: string;
  notes?: string;
  qrCodeDataUrl: string;
  referrals?: PrescriptionPrintReferralSection[];
};

type PrescriptionForPrint = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    dosage: string;
    frequency: number;
    startDate: Date;
    endDate: Date;
    mealRelation: "BEFORE_MEAL" | "AFTER_MEAL" | "WITH_MEAL" | "AT_SPECIFIC_TIME";
    specificTime?: string | null;
    note?: string | null;
    medicine: { name: string };
  }>;
  appointment: {
    id: string;
    patient: {
      id: string;
      first_name: string;
      last_name: string;
      birth_date?: Date | null;
      gender?: string | null;
      phone_number?: string | null;
      pinfl?: string | null;
      document_series?: string | null;
      document_number?: string | null;
    };
    assignment: {
      department?: { name: string } | null;
      user: {
        first_name: string;
        last_name: string;
      };
    };
  };
};

type MapperContext = {
  clinicName: string;
  clinicLogoUrl?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  verifyBaseUrl: string;
  diagnosis?: string;
  notes?: string;
};
