import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { normalizeUnitText } from "../../../common/utils/unit-format";
import { LabResultLayout, normalizeResultLayout } from "../../lab-common/result-layout";

interface ReportRow { code?: string | null; indicator: string; result: string; norm?: string | null; unit?: string | null; }
interface ReportData { patientName: string; patientBirthYear: string | number; orderNumber: string | number; sampleDate: string; analysisTitle: string; doctorName: string; logoBuffer?: Buffer | null; rows: ReportRow[]; resultLayout?: LabResultLayout; }
interface CombinedSection { title: string; rows: ReportRow[]; resultLayout?: LabResultLayout; }
interface CombinedReportData { patientName: string; patientBirthYear: string | number; orderNumber: string | number; sampleDate: string; documentTitle: string; doctorName: string; logoBuffer?: Buffer | null; sections: CombinedSection[]; }

const HEADER_SHADE = "#D9D9D9";
const BORDER_COLOR = "#999999";
const TITLE_COLOR = "#2E74B5";
const START_X = 50;
const TABLE_TOTAL_WIDTH = 495;
const DEFAULT_LOGO_PATH = path.join(__dirname, "../../../assets/images/eur-med-logo.png");

function loadDefaultLogo(): Buffer | null { try { return fs.readFileSync(DEFAULT_LOGO_PATH); } catch { return null; } }
function registerFonts(doc: PDFKit.PDFDocument) {
  const regularFontPath = path.join(__dirname, "../../../assets/fonts/DejaVuSans.ttf");
  const boldFontPath = path.join(__dirname, "../../../assets/fonts/DejaVuSans-Bold.ttf");
  doc.registerFont("RegularFont", regularFontPath); doc.registerFont("BoldFont", boldFontPath);
  return { regularFont: "RegularFont", boldFont: "BoldFont" };
}

function drawCenteredLogo(doc: PDFKit.PDFDocument, logoBuffer: Buffer | null | undefined, boldFont: string) {
  if (logoBuffer) {
    try {
      const width = TABLE_TOTAL_WIDTH;
      const height = Math.round((TABLE_TOTAL_WIDTH / 624) * 216);
      doc.image(logoBuffer, (doc.page.width - width) / 2, doc.y, { width, height });
      doc.y += height + 10;
      return;
    } catch {}
  }
  doc.font(boldFont).fontSize(16).text("EUR-MED HOSPITAL", { align: "center" });
  doc.moveDown();
}

function drawInfoTable(doc: PDFKit.PDFDocument, y: number, data: { patientName: string; orderNumber: string | number; patientBirthYear: string | number; sampleDate: string }, regularFont: string, boldFont: string) {
  const widths = [170, 220, 105];
  const xs = [START_X, START_X + widths[0], START_X + widths[0] + widths[1]];
  const rows = [
    { texts: ["Ф.И.Ш", data.patientName, `№ ${data.orderNumber}`], bold: [true, true, true] },
    { texts: ["Туғилган йили", String(data.patientBirthYear), ""], bold: [true, false, false] },
    { texts: ["Биоматериал топширган куни", data.sampleDate, ""], bold: [true, false, false] },
  ];
  let currentY = y;
  for (const row of rows) {
    doc.fontSize(11);
    let maxHeight = 0;
    row.texts.forEach((text, i) => { doc.font(row.bold[i] ? boldFont : regularFont); maxHeight = Math.max(maxHeight, doc.heightOfString(text || "", { width: widths[i] - 10 })); });
    const rowHeight = maxHeight + 10;
    row.texts.forEach((text, i) => {
      doc.rect(xs[i], currentY, widths[i], rowHeight).strokeColor(BORDER_COLOR).stroke();
      doc.font(row.bold[i] ? boldFont : regularFont).fillColor("#000000").text(text || "", xs[i] + 5, currentY + 5, { width: widths[i] - 10 });
    });
    currentY += rowHeight;
  }
  return currentY;
}

function drawResultRow(doc: PDFKit.PDFDocument, y: number, texts: string[], widths: number[], alignments: ("left" | "center")[], regularFont: string, boldFont: string, header = false) {
  doc.font(header ? boldFont : regularFont).fontSize(10);
  let maxHeight = 0;
  texts.forEach((text, i) => { maxHeight = Math.max(maxHeight, doc.heightOfString(text || "", { width: widths[i] - 8 })); });
  const rowHeight = Math.max(22, maxHeight + 8);
  if (y + rowHeight > doc.page.height - doc.page.margins.bottom) { doc.addPage(); y = doc.page.margins.top; }
  let x = START_X;
  texts.forEach((text, i) => {
    if (header) doc.rect(x, y, widths[i], rowHeight).fillAndStroke(HEADER_SHADE, BORDER_COLOR);
    else doc.rect(x, y, widths[i], rowHeight).strokeColor(BORDER_COLOR).stroke();
    doc.fillColor("#000000").text(text || "", x + 4, y + 4, { width: widths[i] - 8, align: alignments[i] });
    x += widths[i];
  });
  return y + rowHeight;
}

function drawResultsTable(doc: PDFKit.PDFDocument, y: number, rows: ReportRow[], rawLayout: LabResultLayout | undefined, serviceName: string, regularFont: string, boldFont: string) {
  const layout = normalizeResultLayout(rawLayout, serviceName);
  const total = layout.columns.reduce((sum, c) => sum + (c.width ?? 1), 0);
  const widths = layout.columns.map((c) => TABLE_TOTAL_WIDTH * ((c.width ?? 1) / total));
  const headers = layout.columns.map((c) => c.label);
  const alignments = layout.columns.map((c) => c.key === "indicator" ? "left" : "center") as ("left" | "center")[];
  y = drawResultRow(doc, y, headers, widths, alignments, regularFont, boldFont, true);
  for (const row of rows) {
    const values = layout.columns.map((c) => {
      if (c.key === "code") return row.code ?? "";
      if (c.key === "indicator") return row.indicator;
      if (c.key === "result") return row.result ?? "";
      if (c.key === "norm") return row.norm ?? "-";
      if (c.key === "unit") return normalizeUnitText(row.unit) ?? "";
      return "";
    });
    y = drawResultRow(doc, y, values, widths, alignments, regularFont, boldFont, false);
  }
  return y;
}

export const generatePdf = (data: ReportData): Promise<Buffer> => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const fonts = registerFonts(doc);
  drawCenteredLogo(doc, data.logoBuffer ?? loadDefaultLogo(), fonts.boldFont);
  doc.moveDown();
  let y = drawInfoTable(doc, doc.y, { patientName: data.patientName, orderNumber: data.orderNumber, patientBirthYear: data.patientBirthYear, sampleDate: data.sampleDate }, fonts.regularFont, fonts.boldFont);
  doc.y = y + 18;
  doc.font(fonts.boldFont).fontSize(13).fillColor(TITLE_COLOR).text(data.analysisTitle.toUpperCase(), { align: "center" });
  doc.fillColor("#000000").moveDown(1);
  y = doc.y;
  const buffers: Buffer[] = [];
  doc.on("data", buffers.push.bind(buffers)); doc.on("end", () => resolve(Buffer.concat(buffers))); doc.on("error", reject);
  y = drawResultsTable(doc, y, data.rows, data.resultLayout, data.analysisTitle, fonts.regularFont, fonts.boldFont);
  doc.y = y + 25;
  doc.font(fonts.boldFont).fontSize(10).text("Врач лаборант: ", 50, doc.y, { continued: true }).font(fonts.regularFont).text(data.doctorName);
  doc.end();
});

export const generateCombinedPdf = (data: CombinedReportData): Promise<Buffer> => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const fonts = registerFonts(doc);
  drawCenteredLogo(doc, data.logoBuffer ?? loadDefaultLogo(), fonts.boldFont);
  doc.moveDown();
  let y = drawInfoTable(doc, doc.y, { patientName: data.patientName, orderNumber: data.orderNumber, patientBirthYear: data.patientBirthYear, sampleDate: data.sampleDate }, fonts.regularFont, fonts.boldFont);
  doc.y = y + 18;
  doc.font(fonts.boldFont).fontSize(13).fillColor(TITLE_COLOR).text(data.documentTitle.toUpperCase(), { align: "center" });
  doc.fillColor("#000000").moveDown(1);
  y = doc.y;
  const buffers: Buffer[] = [];
  doc.on("data", buffers.push.bind(buffers)); doc.on("end", () => resolve(Buffer.concat(buffers))); doc.on("error", reject);
  data.sections.forEach((section, index) => {
    if (index > 0) y += 14;
    doc.font(fonts.boldFont).fontSize(10).text(section.title, START_X, y, { width: TABLE_TOTAL_WIDTH });
    y = doc.y + 5;
    y = drawResultsTable(doc, y, section.rows, section.resultLayout, section.title, fonts.regularFont, fonts.boldFont);
  });
  doc.y = y + 25;
  doc.font(fonts.boldFont).fontSize(10).text("Врач лаборант: ", 50, doc.y, { continued: true }).font(fonts.regularFont).text(data.doctorName);
  doc.end();
});
