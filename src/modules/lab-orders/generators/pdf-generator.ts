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

export const generatePdf = (data: ReportData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const buffers: Buffer[] = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
    const regularFontPath = path.join(__dirname, "../../../assets/fonts/DejaVuSans.ttf");
    const boldFontPath = path.join(__dirname, "../../../assets/fonts/DejaVuSans-Bold.ttf");

    doc.registerFont("RegularFont", regularFontPath);
    doc.registerFont("BoldFont", boldFontPath);

    const regularFont = "RegularFont";
    const boldFont = "BoldFont";

    // --- LOGOTIP ---
    if (data.logoBuffer) {
      try {
        doc.image(data.logoBuffer, 50, 45, { width: 150 });
        doc.moveDown(3);
      } catch {
        doc.font(boldFont).fontSize(16).text("EUR-MED HOSPITAL", { align: "center" });
      }
    } else {
      doc.font(boldFont).fontSize(16).text("EUR-MED HOSPITAL", { align: "center" });
    }

    doc.moveDown();
    doc.fontSize(11);

    // --- BEMOR MA'LUMOTLARI ---
    doc.font(boldFont).text("Ф.И.Ш: ", { continued: true }).font(regularFont).text(data.patientName);
    doc.font(boldFont).text("№: ", { continued: true }).font(regularFont).text(String(data.orderNumber));
    doc.font(boldFont).text("Туғилган йили: ", { continued: true }).font(regularFont).text(String(data.patientBirthYear));
    doc.font(boldFont).text("Биоматериал топширган куни: ", { continued: true }).font(regularFont).text(data.sampleDate);

    doc.moveDown(2);
    doc.font(boldFont).fontSize(13).text(data.analysisTitle.toUpperCase(), { align: "center" });
    doc.moveDown(1);

    // --- JADVAL SOZLAMALARI ---
    const startX = 50;
    // Ustunlarning kengliklari (Jami: 495 bo'lishi kerak - A4 uchun ideal)
    const colWidths = [45, 160, 80, 110, 100];
    const colX = [
      startX,
      startX + colWidths[0],
      startX + colWidths[0] + colWidths[1],
      startX + colWidths[0] + colWidths[1] + colWidths[2],
      startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]
    ];

    // JADVAL CHIZISH UCHUN FUNKSIYA
    const drawTableRow = (y: number, texts: string[], isHeader: boolean = false) => {
      doc.font(isHeader ? boldFont : regularFont).fontSize(10);

      // Matnning balandligini hisoblash (dinamik katakcha uchun)
      let maxHeight = 0;
      texts.forEach((text, i) => {
        const h = doc.heightOfString(text || "", { width: colWidths[i] - 10 });
        if (h > maxHeight) maxHeight = h;
      });
      const rowHeight = maxHeight + 10; // Padding (tepadan va pastdan joy tashlash)

      // Agar varaq tugab qolsa, yangi bet ochish
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      // Katakchalarni qator bo'ylab chizish
      texts.forEach((text, i) => {
        if (isHeader) {
          // Sarlavha (Header) uchun kulrang orqa fon
          doc.rect(colX[i], y, colWidths[i], rowHeight).fillAndStroke('#f0f0f0', '#000000');
          doc.fillColor('#000000');
        } else {
          // Oddiy qatorlar faqat ramka bilan chiziladi
          doc.rect(colX[i], y, colWidths[i], rowHeight).stroke();
        }

        // Katakcha ichiga matnni yozish
        doc.text(text || "", colX[i] + 5, y + 5, {
          width: colWidths[i] - 10,
          align: isHeader ? 'center' : 'left'
        });
      });

      return y + rowHeight;
    };

    let currentY = doc.y;

    // --- JADVAL SARLAVHASI (HEADER) ---
    const headers = ["Код", "Кўрсаткичлар", "Натижа", "Меъйёри", "Ўлчов бирлиги"];
    currentY = drawTableRow(currentY, headers, true);

    // --- JADVAL TANASI (BODY) ---
    data.rows.forEach((row) => {
      const rowData = [
        row.code ?? "",
        row.indicator,
        row.result,
        row.norm ?? "-",
        normalizeUnitText(row.unit) ?? ""
      ];
      currentY = drawTableRow(currentY, rowData, false);
    });

    // Jadvaldan keyin joy tashlash
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