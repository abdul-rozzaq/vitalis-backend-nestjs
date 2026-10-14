import { Prisma } from "../../generated/prisma/client";

type LabInvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  sourceType: unknown;
  sourceId?: string;
};

/**
 * A single laboratory referral is shown as one journal row. The description
 * keeps the complete service breakdown while the row carries the final total.
 */
export function combineLabInvoiceItems<T extends LabInvoiceItem>(items: T[], finalTotal: Prisma.Decimal): T[] {
  if (items.length === 0) return items;

  const first = items[0];
  return [{
    ...first,
    description: `Laboratoriya tahlillari: ${items.map((item) => item.description).join(", ")}`,
    quantity: 1,
    unitPrice: finalTotal,
    totalPrice: finalTotal,
  }];
}
