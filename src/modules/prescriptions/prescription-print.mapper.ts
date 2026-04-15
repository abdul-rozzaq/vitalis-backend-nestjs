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
};

export type PrescriptionPrintMedication = {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
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
};
