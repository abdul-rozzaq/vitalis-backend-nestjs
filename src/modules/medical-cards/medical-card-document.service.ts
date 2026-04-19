import { Injectable } from "@nestjs/common";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from "docx";

interface DailyNote {
  date: string;
  note: string;
}

interface MedicalCard003Data {
  id: string;
  admissionDate: Date;
  dischargeDate?: Date | null;
  wardNumber?: string | null;
  departmentName?: string | null;
  doctorName?: string | null;
  nurseName?: string | null;
  complaints?: string | null;
  anamnesis?: string | null;
  lifeAnamnesis?: string | null;
  diagnosisInitial?: string | null;
  diagnosisFinal?: string | null;
  treatment?: string | null;
  dailyNotes?: unknown;
  patient: {
    first_name: string;
    last_name: string;
    birth_date: Date;
    gender: string;
    phone_number: string;
    blood_type?: string | null;
    pinfl?: string | null;
    address?: string | null;
    district?: { name: string; region?: { name: string } | null } | null;
  };
}

function fmt(date?: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function val(v?: string | null): string {
  return v?.trim() || "—";
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "2563EB" },
    },
  });
}

function labeledRow(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value, size: 22 }),
    ],
  });
}

function textBlock(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: text || "—", size: 22 })],
  });
}

@Injectable()
export class MedicalCardDocumentService {
  async generate(card: MedicalCard003Data): Promise<Buffer> {
    const patient = card.patient;
    const fullName = `${patient.last_name} ${patient.first_name}`;
    const location = [patient.district?.region?.name, patient.district?.name].filter(Boolean).join(", ");
    const dailyNotes: DailyNote[] = Array.isArray(card.dailyNotes) ? (card.dailyNotes as DailyNote[]) : [];

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "STATSIONAR BEMOR TIBBIY KARTASI",
                  bold: true,
                  size: 32,
                  color: "1E3A5F",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 60 },
              children: [new TextRun({ text: "Shakl № 003/x", size: 22, italics: true, color: "6B7280" })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              children: [new TextRun({ text: `Karta raqami: ${card.id.slice(0, 8).toUpperCase()}`, size: 22, color: "6B7280" })],
            }),

            // Patient Info
            sectionHeading("I. BEMOR MA'LUMOTLARI"),
            labeledRow("F.I.O", fullName),
            labeledRow("Tug'ilgan sana", fmt(patient.birth_date)),
            labeledRow("Jinsi", val(patient.gender === "male" ? "Erkak" : patient.gender === "female" ? "Ayol" : patient.gender)),
            labeledRow("Telefon", val(patient.phone_number)),
            labeledRow("Qon guruhi", val(patient.blood_type?.replace(/_/g, " "))),
            labeledRow("Manzil", val(location || patient.address)),
            ...(patient.pinfl ? [labeledRow("PINFL", patient.pinfl)] : []),

            // Hospitalization Info
            sectionHeading("II. YOTQIZISH MA'LUMOTLARI"),
            labeledRow("Qabul qilingan sana", fmt(card.admissionDate)),
            labeledRow("Chiqarilgan sana", fmt(card.dischargeDate)),
            labeledRow("Bo'lim", val(card.departmentName)),
            labeledRow("Palatа", val(card.wardNumber)),
            labeledRow("Shifokor", val(card.doctorName)),
            labeledRow("Hamshira", val(card.nurseName)),

            // Complaints
            sectionHeading("III. SHIKOYATLAR"),
            textBlock(val(card.complaints)),

            // Anamnesis
            sectionHeading("IV. KASALLIK TARIXI (ANAMNEZ)"),
            textBlock(val(card.anamnesis)),

            // Life Anamnesis
            sectionHeading("V. HAYOT TARIXI (HAYOT ANAMNEZY)"),
            textBlock(val(card.lifeAnamnesis)),

            // Diagnosis
            sectionHeading("VI. TASHXIS"),
            labeledRow("Dastlabki tashxis", val(card.diagnosisInitial)),
            labeledRow("Yakuniy tashxis", val(card.diagnosisFinal)),

            // Treatment
            sectionHeading("VII. DAVOLASH"),
            textBlock(val(card.treatment)),

            // Daily Notes
            ...(dailyNotes.length > 0
              ? [
                  sectionHeading("VIII. KUNLIK KUZATUVLAR"),
                  ...this.buildDailyNotesTable(dailyNotes),
                ]
              : [sectionHeading("VIII. KUNLIK KUZATUVLAR"), textBlock("—")]),

            // Signatures
            sectionHeading("IX. IMZOLAR"),
            new Paragraph({
              spacing: { before: 200, after: 80 },
              children: [
                new TextRun({ text: `Shifokor: ${val(card.doctorName)}`, size: 22 }),
                new TextRun({ text: "          Imzo: _______________", size: 22 }),
              ],
            }),
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({ text: `Hamshira: ${val(card.nurseName)}`, size: 22 }),
                new TextRun({ text: "          Imzo: _______________", size: 22 }),
              ],
            }),
            new Paragraph({
              spacing: { before: 300 },
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: `Sana: ${fmt(new Date())}`, size: 20, italics: true, color: "6B7280" }),
              ],
            }),
          ],
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  private buildDailyNotesTable(notes: DailyNote[]): (Paragraph | Table)[] {
    const rows = notes.map(
      (n) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: n.date, size: 20 } as any)],
            }),
            new TableCell({
              width: { size: 80, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: n.note || "—", size: 20 } as any)],
            }),
          ],
        }),
    );

    const header = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          shading: { type: ShadingType.SOLID, color: "DBEAFE" },
          children: [new Paragraph({ text: "Sana", bold: true, size: 22 } as any)],
        }),
        new TableCell({
          shading: { type: ShadingType.SOLID, color: "DBEAFE" },
          children: [new Paragraph({ text: "Kuzatuv", bold: true, size: 22 } as any)],
        }),
      ],
    });

    return [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [header, ...rows],
      }),
    ];
  }
}
