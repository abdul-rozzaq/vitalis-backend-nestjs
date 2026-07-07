const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

function toSuperscript(digits: string): string {
  return digits
    .split("")
    .map((ch) => SUPERSCRIPT_DIGITS[ch] ?? ch)
    .join("");
}

export function normalizeUnitText(unit?: string | null): string {
  if (!unit) return unit ?? "";
  return unit.replace(/\^(\d+)/g, (_match, digits: string) => toSuperscript(digits));
}