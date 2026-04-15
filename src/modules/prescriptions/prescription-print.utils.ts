export function formatPrintDate(value: Date | string | null | undefined, locale = "en-GB"): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function calculateAge(dateOfBirth: Date | string | null | undefined): number | undefined {
  if (!dateOfBirth) return undefined;

  const birthDate = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);

  if (Number.isNaN(birthDate.getTime())) return undefined;

  const now = new Date();

  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : undefined;
}

export function sanitizePrintableContent(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
