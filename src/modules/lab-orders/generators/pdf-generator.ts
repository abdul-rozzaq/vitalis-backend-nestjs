import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { normalizeUnitText } from "../../../common/utils/unit-format";

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
}

interface CombinedSection {
  title: string;
  rows: ReportRow[];
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

// DOCX generatordagi ranglar bilan bir xil bo'lishi uchun ("EUR-MED_report_docx.ts")
const HEADER_SHADE = "#D9D9D9"; // docx: shade "D9D9D9"
const BORDER_COLOR = "#999999"; // docx: CELL_BORDERS color "999999"
const TITLE_COLOR = "#2E74B5"; // docx: sarlavha rangi

// --- STANDART LOGOTIP ---
// docx generatordagi bilan bir xil: chaqiruvchi tomon logoBuffer bermasa,
// shu standart fayl ishlatiladi (src/assets/images/eur-med-logo.png).
const DEFAULT_LOGO_PATH = path.join(__dirname, "../../../assets/images/eur-med-logo.png");

function loadDefaultLogo(): Buffer | null {
  try {
    return fs.readFileSync(DEFAULT_LOGO_PATH);
  } catch {
    return null; // fayl topilmasa, logotipsiz (matnli sarlavha bilan) davom etadi
  }
}

const START_X = 50;
const TABLE_TOTAL_WIDTH = 495; // A4, margin 50+50 bilan mos (~docx TABLE_WIDTH nisbatida)

// docx: infoColWidths = [3200, 4150, 2000] (jami 9350) -> proporsional PDF uchun
const INFO_COL_WIDTHS = [170, 220, 105];
const INFO_COL_X = [
  START_X,
  START_X + INFO_COL_WIDTHS[0],
  START_X + INFO_COL_WIDTHS[0] + INFO_COL_WIDTHS[1],
];

// docx: resultColWidths = [1200, 2600, 1850, 1850, 1850] (jami 9350) -> proporsional
const RESULT_COL_WIDTHS = [63, 138, 98, 98, 98];
const RESULT_COL_X = [
  START_X,
  START_X + RESULT_COL_WIDTHS[0],
  START_X + RESULT_COL_WIDTHS[0] + RESULT_COL_WIDTHS[1],
  START_X + RESULT_COL_WIDTHS[0] + RESULT_COL_WIDTHS[1] + RESULT_COL_WIDTHS[2],
  START_X + RESULT_COL_WIDTHS[0] + RESULT_COL_WIDTHS[1] + RESULT_COL_WIDTHS[2] + RESULT_COL_WIDTHS[3],
];
// docx: Код markazda, Кўрсаткичлар chapda, Натижа/Меъйёри/Ўлчов бирлиги markazda
const RESULT_COL_ALIGN: ("left" | "center")[] = ["center", "left", "center", "center", "center"];

function registerFonts(doc: PDFKit.PDFDocument) {
  const regularFontPath = path.join(__dirname, "../../../assets/fonts/DejaVuSans.ttf");
  const boldFontPath = path.join(__dirname, "../../../assets/fonts/DejaVuSans-Bold.ttf");
  doc.registerFont("RegularFont", regularFontPath);
  doc.registerFont("BoldFont", boldFontPath);
  return { regularFont: "RegularFont", boldFont: "BoldFont" };
}

// Logotipni docx'dagi kabi markazlashtirib chizish (docx: AlignmentType.CENTER, 624x216)
function drawCenteredLogo(doc: PDFKit.PDFDocument, logoBuffer: Buffer | null | undefined, boldFont: string) {
  if (logoBuffer) {
    try {
      // docx'da logotip butun jadval kengligiga (TABLE_WIDTH ≈ 6.5in) teng
      // chiqariladi (transformation width/height: 624x216 px). PDF'da ham
      // xuddi shu nisbat va xuddi shu jadval kengligi (TABLE_TOTAL_WIDTH) ishlatiladi.
      const width = TABLE_TOTAL_WIDTH;
      const height = Math.round((TABLE_TOTAL_WIDTH / 624) * 216);
      const x = (doc.page.width - width) / 2;
      doc.image(logoBuffer, x, doc.y, { width, height });
      doc.y += height + 10;
      return;
    } catch {
      // pastga tushib, matnli sarlavhaga o'tadi
    }
  }
  doc.font(boldFont).fontSize(16).text("EUR-MED HOSPITAL", { align: "center" });
  doc.moveDown();
}

// docx infoTable bilan bir xil: 3 ustunli, ramkali, "Ф.И.Ш / Туғилган йили /
// Биоматериал топширган куни" jadvali
function drawInfoTable(
  doc: PDFKit.PDFDocument,
  y: number,
  data: { patientName: string; orderNumber: string | number; patientBirthYear: string | number; sampleDate: string },
  regularFont: string,
  boldFont: string,
): number {
  const rows: { texts: string[]; bold: boolean[] }[] = [
    { texts: ["Ф.И.Ш", data.patientName, `№ ${data.orderNumber}`], bold: [true, true, true] },
    { texts: ["Туғилган йили", String(data.patientBirthYear), ""], bold: [true, false, false] },
    { texts: ["Биоматериал топширган куни", data.sampleDate, ""], bold: [true, false, false] },
  ];

  let currentY = y;
  rows.forEach((row) => {
    // docx'da textCell matnlari uchun alohida size berilmagan, shuning uchun
    // Word'ning standart shrift o'lchami (11pt) qo'llaniladi
    doc.fontSize(11);
    let maxHeight = 0;
    row.texts.forEach((text, i) => {
      doc.font(row.bold[i] ? boldFont : regularFont);
      const h = doc.heightOfString(text || "", { width: INFO_COL_WIDTHS[i] - 10 });
      if (h > maxHeight) maxHeight = h;
    });
    const rowHeight = maxHeight + 10;

    if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      currentY = doc.page.margins.top;
    }

    row.texts.forEach((text, i) => {
      doc.rect(INFO_COL_X[i], currentY, INFO_COL_WIDTHS[i], rowHeight).strokeColor(BORDER_COLOR).stroke();
      doc
        .fillColor("#000000")
        .font(row.bold[i] ? boldFont : regularFont)
        .text(text || "", INFO_COL_X[i] + 5, currentY + 5, { width: INFO_COL_WIDTHS[i] - 10 });
    });

    currentY += rowHeight;
  });

  return currentY;
}

// docx resultsTable bilan bir xil: sarlavha D9D9D9 fon, ramka rangi 999999,
// ustunlar bo'yicha to'g'rilash (markaz/chap) mos keladi
const drawResultsTableRow = (
  doc: PDFKit.PDFDocument,
  y: number,
  texts: string[],
  regularFont: string,
  boldFont: string,
  isHeader = false,
): number => {
  // docx'da resultsTable matnlari uchun alohida size berilmagan, shuning
  // uchun Word'ning standart shrift o'lchami (11pt) qo'llaniladi
  doc.font(isHeader ? boldFont : regularFont).fontSize(11);

  let maxHeight = 0;
  texts.forEach((text, i) => {
    const h = doc.heightOfString(text || "", { width: RESULT_COL_WIDTHS[i] - 10 });
    if (h > maxHeight) maxHeight = h;
  });
  const rowHeight = maxHeight + 10;

  if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  texts.forEach((text, i) => {
    if (isHeader) {
      doc.rect(RESULT_COL_X[i], y, RESULT_COL_WIDTHS[i], rowHeight).fillAndStroke(HEADER_SHADE, BORDER_COLOR);
      doc.fillColor("#000000");
    } else {
      doc.rect(RESULT_COL_X[i], y, RESULT_COL_WIDTHS[i], rowHeight).strokeColor(BORDER_COLOR).stroke();
    }

    doc.text(text || "", RESULT_COL_X[i] + 5, y + 5, {
      width: RESULT_COL_WIDTHS[i] - 10,
      align: isHeader ? "center" : RESULT_COL_ALIGN[i],
    });
  });

  return y + rowHeight;
};

// "Umumiy" hujjat — bitta buyurtmadagi barcha xizmatlarning natijasi bitta
// PDF faylida: bemor ma'lumotlari va sarlavha bir marta yuqorida, har bir
// xizmat esa o'z kichik sarlavhasi va jadvali bilan ketma-ket joylanadi.
export const generateCombinedPdf = (data: CombinedReportData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const buffers: Buffer[] = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const { regularFont, boldFont } = registerFonts(doc);

    // --- LOGOTIP (markazda, docx bilan bir xil) ---
    drawCenteredLogo(doc, data.logoBuffer ?? loadDefaultLogo(), boldFont);

    doc.moveDown();

    // --- BEMOR MA'LUMOTLARI (docx'dagi kabi jadval) ---
    let currentY = drawInfoTable(
      doc,
      doc.y,
      {
        patientName: data.patientName,
        orderNumber: data.orderNumber,
        patientBirthYear: data.patientBirthYear,
        sampleDate: data.sampleDate,
      },
      regularFont,
      boldFont,
    );

    doc.y = currentY + 20;
    doc.font(boldFont).fontSize(13).fillColor(TITLE_COLOR).text(data.documentTitle.toUpperCase(), { align: "center" });
    doc.fillColor("#000000");
    doc.moveDown(1);

    currentY = doc.y;
    const headers = ["Код", "Кўрсаткичлар", "Натижа", "Меъйёри", "Ўлчов бирлиги"];

    data.sections.forEach((section, index) => {
      if (index > 0) currentY += 18;

      if (currentY + 24 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }

      doc.font(boldFont).fontSize(11).fillColor("#000000").text(section.title, START_X, currentY, { width: TABLE_TOTAL_WIDTH });
      currentY = doc.y + 6;

      currentY = drawResultsTableRow(doc, currentY, headers, regularFont, boldFont, true);
      section.rows.forEach((row) => {
        const rowData = [row.code ?? "", row.indicator, row.result, row.norm ?? "-", normalizeUnitText(row.unit) ?? ""];
        currentY = drawResultsTableRow(doc, currentY, rowData, regularFont, boldFont, false);
      });
    });

    doc.y = currentY + 30;

    // --- IMZO QISMI ---
    doc
      .font(boldFont)
      .fontSize(11)
      .text("Врач лаборант: ", 50, doc.y, { continued: true })
      .font(regularFont)
      .text(data.doctorName);

    doc.end();
  });
};

export const generatePdf = (data: ReportData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const buffers: Buffer[] = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const { regularFont, boldFont } = registerFonts(doc);

    // --- LOGOTIP (markazda, docx bilan bir xil) ---
    drawCenteredLogo(doc, data.logoBuffer ?? loadDefaultLogo(), boldFont);

    doc.moveDown();

    // --- BEMOR MA'LUMOTLARI (docx'dagi kabi jadval) ---
    let currentY = drawInfoTable(
      doc,
      doc.y,
      {
        patientName: data.patientName,
        orderNumber: data.orderNumber,
        patientBirthYear: data.patientBirthYear,
        sampleDate: data.sampleDate,
      },
      regularFont,
      boldFont,
    );

    doc.y = currentY + 20;
    doc.font(boldFont).fontSize(13).fillColor(TITLE_COLOR).text(data.analysisTitle.toUpperCase(), { align: "center" });
    doc.fillColor("#000000");
    doc.moveDown(1);

    // --- JADVAL SARLAVHASI (HEADER) ---
    let tableY = doc.y;
    const headers = ["Код", "Кўрсаткичлар", "Натижа", "Меъйёри", "Ўлчов бирлиги"];
    tableY = drawResultsTableRow(doc, tableY, headers, regularFont, boldFont, true);

    // --- JADVAL TANASI (BODY) ---
    data.rows.forEach((row) => {
      const rowData = [row.code ?? "", row.indicator, row.result, row.norm ?? "-", normalizeUnitText(row.unit) ?? ""];
      tableY = drawResultsTableRow(doc, tableY, rowData, regularFont, boldFont, false);
    });

    doc.y = tableY + 30;

    // --- IMZO QISMI ---
    doc
      .font(boldFont)
      .fontSize(11)
      .text("Врач лаборант: ", 50, doc.y, { continued: true })
      .font(regularFont)
      .text(data.doctorName);

    doc.end();
  });
};