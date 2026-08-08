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
import { LabResultLayout, normalizeResultLayout } from "../../lab-common/result-layout";

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
  logoBuffer?: Buffer | null;
  rows: ReportRow[];
  resultLayout?: LabResultLayout;
}

interface CombinedSection {
  title: string;
  rows: ReportRow[];
  resultLayout?: LabResultLayout;
}

interface CombinedReportData {
  patientName: string;
  patientBirthYear: string | number;
  orderNumber: string | number;
  sampleDate: string;
  documentTitle: string;
  doctorName: string;
  logoBuffer?: Buffer | null;
  sections: CombinedSection[];
}

const TABLE_WIDTH = 9350;
const CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
};
const DEFAULT_LOGO_PATH = path.join(__dirname, "../../../assets/images/eur-med-logo.png");

function loadDefaultLogo(): Buffer | null {
  try { return fs.readFileSync(DEFAULT_LOGO_PATH); } catch { return null; }
}

function textCell(
  text: string,
  opts: { bold?: boolean; width: number; shade?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] },
) {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    borders: CELL_BORDERS,
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade, color: "auto" } : undefined,
    children: [new Paragraph({ alignment: opts.align, children: [new TextRun({ text, bold: !!opts.bold })] })],
  });
}

function buildResultsTable(rows: ReportRow[], rawLayout?: LabResultLayout, serviceName?: string) {
  const layout = normalizeResultLayout(rawLayout, serviceName);
  const columns = layout.columns;
  const totalWeight = columns.reduce((sum, column) => sum + (column.width ?? 1), 0);
  const widths = columns.map((column) => Math.round((column.width ?? 1) / totalWeight * TABLE_WIDTH));

  const value = (row: ReportRow, key: string) => {
    if (key === "code") return row.code ?? "";
    if (key === "indicator") return row.indicator;
    if (key === "result") return row.result ?? "";
    if (key === "norm") return row.norm ?? "-";
    if (key === "unit") return normalizeUnitText(row.unit) ?? "";
    return "";
  };

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: columns.map((column, i) =>
          textCell(column.label, { bold: true, width: widths[i], shade: "D9D9D9", align: AlignmentType.CENTER }),
        ),
      }),
      ...rows.map((row) => new TableRow({
        children: columns.map((column, i) => textCell(value(row, column.key), {
          width: widths[i],
          align: column.key === "indicator" ? AlignmentType.LEFT : AlignmentType.CENTER,
        })),
      })),
    ],
  });
}

function buildInfoTable(data: { patientName: string; patientBirthYear: string | number; orderNumber: string | number; sampleDate: string }) {
  const widths = [3200, 4150, 2000];
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ children: [textCell("Ф.И.Ш", { bold: true, width: widths[0] }), textCell(data.patientName, { bold: true, width: widths[1] }), textCell(`№ ${data.orderNumber}`, { bold: true, width: widths[2] })] }),
      new TableRow({ children: [textCell("Туғилган йили", { bold: true, width: widths[0] }), textCell(String(data.patientBirthYear), { width: widths[1] }), textCell("", { width: widths[2] })] }),
      new TableRow({ children: [textCell("Биоматериал топширган куни", { bold: true, width: widths[0] }), textCell(data.sampleDate, { width: widths[1] }), textCell("", { width: widths[2] })] }),
    ],
  });
}

function buildDocument(data: CombinedReportData | ReportData, combined: boolean) {
  const logoBuffer = data.logoBuffer ?? loadDefaultLogo();
  const children: any[] = [];

  if (logoBuffer) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: logoBuffer, type: "png", transformation: { width: 624, height: 216 } })] }));
  } else {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "EUR-MED HOSPITAL", bold: true, size: 32 })] }));
  }

  children.push(new Paragraph({ text: "" }));
  children.push(buildInfoTable(data));
  children.push(new Paragraph({ text: "" }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (combined ? (data as CombinedReportData).documentTitle : (data as ReportData).analysisTitle).toUpperCase(), bold: true, size: 26, color: "2E74B5" })] }));

  if (combined) {
    for (const section of (data as CombinedReportData).sections) {
      children.push(new Paragraph({ text: "" }));
      children.push(new Paragraph({ children: [new TextRun({ text: section.title, bold: true, size: 22 })] }));
      children.push(new Paragraph({ text: "" }));
      children.push(buildResultsTable(section.rows, section.resultLayout, section.title));
    }
  } else {
    children.push(new Paragraph({ text: "" }));
    children.push(buildResultsTable((data as ReportData).rows, (data as ReportData).resultLayout, (data as ReportData).analysisTitle));
  }

  children.push(new Paragraph({ text: "" }));
  children.push(new Paragraph({ children: [new TextRun({ text: "Врач лаборант: ", bold: true }), new TextRun({ text: data.doctorName })] }));

  return new Document({ sections: [{ properties: { page: { size: { width: 11907, height: 16840 } } }, children }] });
}

export const generateDocx = async (data: ReportData): Promise<Buffer> => Packer.toBuffer(buildDocument(data, false));
export const generateCombinedDocx = async (data: CombinedReportData): Promise<Buffer> => Packer.toBuffer(buildDocument(data, true));
