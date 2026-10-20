export interface PatientJwtPayload {
  type: "patient";
  patientId: string;
  phone: string;
}

export interface PatientPreAuthJwtPayload {
  type: "patient-preauth";
  phone: string;
}
