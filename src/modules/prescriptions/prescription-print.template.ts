import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Eta } from "eta";
import { PrescriptionPrintDocument } from "./prescription-print.mapper";

type Row = {
  label: string;
  value: string | number;
};

type PrescriptionTemplateModel = {
  document: PrescriptionPrintDocument;
  clinicSubtitle: string;
  patientInfoRows: Row[];
  doctorInfoRows: Row[];
};

const eta = new Eta({
  cache: true,
  autoEscape: false,
  useWith: true,
});

let compiledTemplate: ((this: Eta, data?: object, options?: { async?: boolean; filepath?: string }) => string) | null = null;

function normalizeValue(value: string | number | undefined): string | number {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  return value;
}

function compilePrescriptionTemplate() {
  if (compiledTemplate) {
    return compiledTemplate;
  }

  const templatePath = join(__dirname, "templates", "prescription-print.eta.html");

  const templateSource = readFileSync(templatePath, "utf8");
  compiledTemplate = eta.compile(templateSource);
  return compiledTemplate;
}

function buildViewModel(document: PrescriptionPrintDocument): PrescriptionTemplateModel {
  const subtitleParts = [document.clinic.address, document.clinic.phone].filter(Boolean);

  return {
    document,
    clinicSubtitle: subtitleParts.length > 0 ? subtitleParts.join(" • ") : "",
    patientInfoRows: [
      { label: "Full name", value: normalizeValue(document.patient.fullName) },
      { label: "Age", value: normalizeValue(document.patient.age) },
      { label: "Gender", value: normalizeValue(document.patient.gender) },
      { label: "Phone", value: normalizeValue(document.patient.phone) },
      {
        label: "Patient ID",
        value: normalizeValue(document.patient.identifier),
      },
    ],
    doctorInfoRows: [
      { label: "Doctor", value: normalizeValue(document.doctor.fullName) },
      {
        label: "Specialization",
        value: normalizeValue(document.doctor.specialization),
      },
      {
        label: "Signature",
        value: normalizeValue(document.doctor.signaturePlaceholder),
      },
    ],
  };
}

export function renderPrescriptionPrintTemplate(document: PrescriptionPrintDocument): string {
  const render = compilePrescriptionTemplate();
  return render.call(eta, buildViewModel(document));
}
