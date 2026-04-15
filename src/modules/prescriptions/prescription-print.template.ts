import { Eta } from "eta";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrescriptionPrintDocument } from "./prescription-print.mapper";

type PrescriptionTemplateModel = {
  document: PrescriptionPrintDocument;
  clinicSubtitle: string;
};

const eta = new Eta({
  cache: true,
  autoEscape: false,
  useWith: true,
});

let compiledTemplate: ((this: Eta, data?: object, options?: { async?: boolean; filepath?: string }) => string) | null = null;

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
  };
}

export function renderPrescriptionPrintTemplate(document: PrescriptionPrintDocument): string {
  const render = compilePrescriptionTemplate();
  return render.call(eta, buildViewModel(document));
}
