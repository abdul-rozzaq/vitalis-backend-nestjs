import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import fs from "fs";
import path from "path";
import { normalizeUnitText } from "../../../common/utils/unit-format";

// Agar ESM emas, CommonJS bo'lsa, __dirname avtomatik mavjud bo'ladi.
// Loyihangiz "type": "module" bo'lsa-yu, lekin Nest CommonJS'ga build qilsa,
// bu qatorlarni olib tashlang va to'g'ridan-to'g'ri __dirname'dan foydalaning.

interface ReportRow {
  code?: string | null;
  indicator: string;
  result: string;
  norm?: string | null;
  unit?: string | null;
}

interface ReportData {
  patientName: string;
  patientBirthYear: string | number;
  orderNumber: string | number;
  sampleDate: string;
  analysisTitle: string;
  doctorName: string;
  logoBuffer?: Buffer | null; // berilmasa, standart EUR-MED logotipi ishlatiladi
  rows: ReportRow[];
}

const TABLE_WIDTH = 9350; // DXA, A4 uchun taxminan 6.5in ish maydoni

const CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
};

// --- STANDART LOGOTIP ---
// src/assets/images/eur-med-logo.png ostiga joylashtiring.
// Agar chaqiruvchi tomon data.logoBuffer bersa, o'sha ustunlik qiladi;
// aks holda shu standart fayl ishlatiladi.
const DEFAULT_LOGO_PATH = path.join(__dirname, "../../../assets/images/eur-med-logo.png");

function loadDefaultLogo(): Buffer | null {
  try {
    return fs.readFileSync(DEFAULT_LOGO_PATH);
  } catch {
    return null; // fayl topilmasa, logotipsiz davom etadi (matn bilan almashtiriladi)
  }
}

function textCell(
  text: string,
  opts: { bold?: boolean; width: number; shade?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] },
) {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    borders: CELL_BORDERS,
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade, color: "auto" } : undefined,
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [new TextRun({ text, bold: !!opts.bold })],
      }),
    ],
  });
}

export const generateDocx = async (data: ReportData): Promise<Buffer> => {
  const infoColWidths = [3200, 4150, 2000];

  const infoTable = new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: infoColWidths,
    rows: [
      new TableRow({
        children: [
          textCell("Ф.И.Ш", { bold: true, width: infoColWidths[0] }),
          textCell(data.patientName, { bold: true, width: infoColWidths[1] }),
          textCell(`№ ${data.orderNumber}`, { bold: true, width: infoColWidths[2] }),
        ],
      }),
      new TableRow({
        children: [
          textCell("Туғилган йили", { bold: true, width: infoColWidths[0] }),
          textCell(String(data.patientBirthYear), { width: infoColWidths[1] }),
          textCell("", { width: infoColWidths[2] }),
        ],
      }),
      new TableRow({
        children: [
          textCell("Биоматериал топширган куни", { bold: true, width: infoColWidths[0] }),
          textCell(data.sampleDate, { width: infoColWidths[1] }),
          textCell("", { width: infoColWidths[2] }),
        ],
      }),
    ],
  });

  const resultColWidths = [1200, 2600, 1850, 1850, 1850];

  const resultsTable = new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: resultColWidths,
    rows: [
      new TableRow({
        children: [
          textCell("Код", { bold: true, width: resultColWidths[0], shade: "D9D9D9", align: AlignmentType.CENTER }),
          textCell("Кўрсаткичлар", { bold: true, width: resultColWidths[1], shade: "D9D9D9" }),
          textCell("Натижа", { bold: true, width: resultColWidths[2], shade: "D9D9D9", align: AlignmentType.CENTER }),
          textCell("Меъйёри", { bold: true, width: resultColWidths[3], shade: "D9D9D9", align: AlignmentType.CENTER }),
          textCell("Ўлчов бирлиги", { bold: true, width: resultColWidths[4], shade: "D9D9D9", align: AlignmentType.CENTER }),
        ],
      }),
      ...data.rows.map(
        (row) =>
          new TableRow({
            children: [
              textCell(row.code ?? "", { width: resultColWidths[0], align: AlignmentType.CENTER }),
              textCell(row.indicator, { width: resultColWidths[1] }),
              textCell(row.result, { width: resultColWidths[2], align: AlignmentType.CENTER }),
              textCell(row.norm ?? "-", { width: resultColWidths[3], align: AlignmentType.CENTER }),
              textCell(normalizeUnitText(row.unit) ?? "", { width: resultColWidths[4], align: AlignmentType.CENTER }),
            ],
          }),
      ),
    ],
  });

  // --- LOGOTIP QISMI ---
  // Ustuvorlik: 1) data.logoBuffer (chaqiruvchi bergan bo'lsa)
  //             2) standart bundle qilingan EUR-MED logotipi
  //             3) hech biri topilmasa, matnli sarlavha
  const logoBuffer = data.logoBuffer ?? loadDefaultLogo();

  const headerChildren: Paragraph[] = [];

  if (logoBuffer) {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: logoBuffer,
            type: "png",
            // Jadval kengligiga (TABLE_WIDTH = 9350 DXA ≈ 624px) moslashtirildi,
            // asl logotip nisbati (1368x473) saqlangan holda
            transformation: { width: 624, height: 216 },
          }),
        ],
      }),
    );
  } else {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "EUR-MED HOSPITAL", bold: true, size: 32 })],
      }),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { width: 11907, height: 16840 } }, // A4 DXA
        },
        children: [
          ...headerChildren,
          new Paragraph({ text: "" }),
          infoTable,
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: data.analysisTitle.toUpperCase(), bold: true, size: 26, color: "2E74B5" })],
          }),
          new Paragraph({ text: "" }),
          resultsTable,
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Врач лаборант: ", bold: true }),
              new TextRun({ text: data.doctorName }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
};