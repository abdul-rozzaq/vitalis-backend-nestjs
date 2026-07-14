import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const TABLE_WIDTH = 9350; // DXA, A4 ish maydoni (~6.5in)

const CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
};

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

export interface OperationContractRow {
  name: string;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OperationContractData {
  contractNumber: string;
  contractTime: string; // masalan "11:12"
  startDate: Date;
  endDate?: Date | null;
  patientFullName: string;
  patientBirthDate?: Date | null;
  patientAddress?: string | null;
  departmentName?: string | null;
  diagnosis?: string | null;
  doctorName?: string | null;
  rows: OperationContractRow[];
  totalPrice: number;
  // Jadvalda bemor qo'lda to'ldirishi/imzo qo'yishi uchun bo'sh qatorlar soni
  minRowCount?: number;
}

function fmtDate(date?: Date | null): string {
  if (!date) return '____';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function fmtMoney(value: number): string {
  return Math.round(value).toLocaleString('ru-RU').replace(/,/g, ' ');
}

function labelLine(label: string, value: string, opts?: { bold?: boolean }): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value, bold: !!opts?.bold, size: 22 }),
    ],
  });
}

function headerCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: CELL_BORDERS,
    shading: { type: ShadingType.CLEAR, fill: 'D9D9D9', color: 'auto' },
    verticalAlign: 'center',
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size: 20 })],
      }),
    ],
  });
}

function bodyCell(text: string, width: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, size: 20 })],
      }),
    ],
  });
}

function buildServicesTable(rows: OperationContractRow[], minRowCount: number) {
  // № | Хизматлар номи | Улчов бирлиги | микдори | Нархи (сум) | Суммаси | Бемор имзоси
  const colWidths = [500, 2900, 1250, 1200, 1250, 1400, 850];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('№', colWidths[0]),
      headerCell('Хизматлар номи', colWidths[1]),
      headerCell('Улчов бирлиги', colWidths[2]),
      headerCell('микдори', colWidths[3]),
      headerCell('Нархи (сум)', colWidths[4]),
      headerCell('Суммаси', colWidths[5]),
      headerCell('Бемор имзоси', colWidths[6]),
    ],
  });

  const dataRows = rows.map(
    (row, idx) =>
      new TableRow({
        children: [
          bodyCell(String(idx + 1), colWidths[0], AlignmentType.CENTER),
          bodyCell(row.name, colWidths[1]),
          bodyCell(row.unit ?? '', colWidths[2], AlignmentType.CENTER),
          bodyCell(String(row.quantity), colWidths[3], AlignmentType.CENTER),
          bodyCell(fmtMoney(row.unitPrice), colWidths[4], AlignmentType.RIGHT),
          bodyCell(fmtMoney(row.totalPrice), colWidths[5], AlignmentType.RIGHT),
          bodyCell('', colWidths[6]),
        ],
      }),
  );

  // Qog'oz shakldagidek, bemor qo'lda to'ldirishi mumkin bo'lgan bo'sh qatorlar
  const blankRowsNeeded = Math.max(0, minRowCount - dataRows.length);
  const blankRows = Array.from({ length: blankRowsNeeded }).map(
    (_, i) =>
      new TableRow({
        children: [
          bodyCell(String(dataRows.length + i + 1), colWidths[0], AlignmentType.CENTER),
          bodyCell('', colWidths[1]),
          bodyCell('', colWidths[2]),
          bodyCell('', colWidths[3]),
          bodyCell('', colWidths[4]),
          bodyCell('', colWidths[5]),
          bodyCell('', colWidths[6]),
        ],
      }),
  );

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows, ...blankRows],
  });
}

export const generateOperationContractDocx = async (
  data: OperationContractData,
): Promise<Buffer> => {
  const topInfoTable = new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [4675, 4675],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4675, type: WidthType.DXA },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Соат: ', bold: true, size: 22 }),
                  new TextRun({ text: data.contractTime, size: 22 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4675, type: WidthType.DXA },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Шартнома № ', bold: true, size: 22 }),
                  new TextRun({ text: data.contractNumber, bold: true, size: 22 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { width: 11907, height: 16840 } }, // A4 DXA
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: '"EUROMED FAMILY" МЧЖ клиникаси', bold: true, size: 26 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'Диагностика ва даволаш маркази хисоб китоби', bold: true, size: 22 }),
            ],
          }),
          topInfoTable,
          new Paragraph({ text: '', spacing: { after: 120 } }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: `${fmtDate(data.startDate)} йилдан ` , size: 22 }),
              new TextRun({ text: `${fmtDate(data.endDate)} гача даволаш учун`, size: 22 }),
            ],
          }),
          labelLine('Ф.И.О', data.patientFullName, { bold: true }),
          labelLine('Туғилган сана', fmtDate(data.patientBirthDate)),
          labelLine('Манзил', data.patientAddress ?? '—'),
          labelLine("Бўлим", data.departmentName ?? '—'),
          labelLine('Ташхис', data.diagnosis ?? '—'),
          labelLine('Даволовчи шифокор', data.doctorName ?? '—'),
          new Paragraph({
            spacing: { before: 100, after: 150 },
            children: [
              new TextRun({
                text:
                  "Куйидаги тиббий хизматлар даволаш диагностикасини тулик хажмда бажаришни. Бемор эса хизмат учун хак тулашни уз буйнига оладилар",
                italics: true,
                size: 18,
              }),
            ],
          }),
          buildServicesTable(data.rows, data.minRowCount ?? 20),
          new Paragraph({ text: '', spacing: { before: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Жами: ', bold: true, size: 22 }),
              new TextRun({ text: `${fmtMoney(data.totalPrice)} сум`, bold: true, size: 22 }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
};
