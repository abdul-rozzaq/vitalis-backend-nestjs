export type LabResultColumnKey = "code" | "indicator" | "result" | "norm" | "unit";

export interface LabResultColumn {
  key: LabResultColumnKey;
  label: string;
  width?: number;
}

export interface LabResultLayout {
  columns: LabResultColumn[];
}

export const CBC_RESULT_LAYOUT: LabResultLayout = {
  columns: [
    { key: "code", label: "", width: 10 },
    { key: "indicator", label: "Кўрсаткичлар", width: 30 },
    { key: "result", label: "Натижа", width: 16 },
    { key: "norm", label: "Меъйёри", width: 27 },
    { key: "unit", label: "Ўлчов бирлиги", width: 17 },
  ],
};

export const BIOCHEMISTRY_RESULT_LAYOUT: LabResultLayout = {
  columns: [
    { key: "indicator", label: "Анализ тури", width: 48 },
    { key: "result", label: "Натижа", width: 20 },
    { key: "norm", label: "Меъёри", width: 32 },
  ],
};

export const DEFAULT_RESULT_LAYOUT = CBC_RESULT_LAYOUT;

export function normalizeResultLayout(layout?: unknown, serviceName?: string): LabResultLayout {
  if (layout && typeof layout === "object" && Array.isArray((layout as any).columns)) {
    const columns = (layout as any).columns.filter((c: any) => c && typeof c.key === "string" && typeof c.label === "string");
    if (columns.length) return { columns };
  }

  const name = (serviceName ?? "").toLowerCase();
  if (name.includes("biokim") || name.includes("биоким") || name.includes("biochim")) {
    return BIOCHEMISTRY_RESULT_LAYOUT;
  }

  return DEFAULT_RESULT_LAYOUT;
}

export function unpackRowsPayload(payload: unknown, serviceName?: string) {
  if (Array.isArray(payload)) {
    return { rows: payload as any[], layout: normalizeResultLayout(undefined, serviceName) };
  }

  if (payload && typeof payload === "object") {
    const value = payload as any;
    return {
      rows: Array.isArray(value.rows) ? value.rows : [],
      layout: normalizeResultLayout(value.layout, serviceName),
    };
  }

  return { rows: [], layout: normalizeResultLayout(undefined, serviceName) };
}

export function packRowsPayload(rows: unknown[], layout?: unknown, serviceName?: string) {
  return {
    layout: normalizeResultLayout(layout, serviceName),
    rows,
  };
}
