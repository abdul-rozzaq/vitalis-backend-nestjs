import { Injectable } from "@nestjs/common";
import { InvoiceSourceType } from "../../generated/prisma/enums";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenue(from: Date, to: Date) {
    const payments = await this.prisma.invoicePayment.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        cashAmount: true,
        bonusAmount: true,
        totalAmount: true,
        invoice: { select: { sourceType: true } },
      },
    });

    const totals = payments.reduce(
      (acc, p) => ({
        cash: acc.cash + Number(p.cashAmount),
        bonus: acc.bonus + Number(p.bonusAmount),
        total: acc.total + Number(p.totalAmount),
      }),
      { cash: 0, bonus: 0, total: 0 },
    );

    const bySourceMap = new Map<InvoiceSourceType, { cash: number; bonus: number; total: number; count: number }>();
    for (const p of payments) {
      const key = p.invoice.sourceType;
      const entry = bySourceMap.get(key) ?? { cash: 0, bonus: 0, total: 0, count: 0 };
      entry.cash += Number(p.cashAmount);
      entry.bonus += Number(p.bonusAmount);
      entry.total += Number(p.totalAmount);
      entry.count += 1;
      bySourceMap.set(key, entry);
    }

    const bySource = Array.from(bySourceMap.entries())
      .map(([sourceType, v]) => ({ sourceType, ...v }))
      .sort((a, b) => b.total - a.total);

    return {
      from,
      to,
      totals: { ...totals, paymentsCount: payments.length },
      bySource,
    };
  }

  /** So'nggi N oy uchun oylik daromadni manba bo'yicha guruhlab qaytaradi (trend chart uchun). */
  async getMonthlyRevenue(months: number) {
    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const payments = await this.prisma.invoicePayment.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: {
        totalAmount: true,
        createdAt: true,
        invoice: { select: { sourceType: true } },
      },
    });

    const monthMap = new Map<string, Map<InvoiceSourceType, number>>();
    for (const p of payments) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const bySource = monthMap.get(key) ?? new Map<InvoiceSourceType, number>();
      bySource.set(p.invoice.sourceType, (bySource.get(p.invoice.sourceType) ?? 0) + Number(p.totalAmount));
      monthMap.set(key, bySource);
    }

    const result: { month: string; total: number; bySource: Record<string, number> }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bySource = monthMap.get(key) ?? new Map<InvoiceSourceType, number>();
      const bySourceObj = Object.fromEntries(bySource);
      const total = Array.from(bySource.values()).reduce((s, v) => s + v, 0);
      result.push({ month: key, total, bySource: bySourceObj });
    }

    return result;
  }

  /**
   * Bitta manba (masalan LAB_ORDER) ichidagi xizmatlar (InvoiceItem.description)
   * bo'yicha taqsimot. To'lov invoice darajasida saqlanadi (item darajasida
   * emas), shuning uchun har bir to'lovni o'sha invoice'ning itemlari orasida
   * ularning nominal narxi ulushiga proporsional taqsimlaymiz (pro-rata) —
   * bu "qaysi xizmat qancha daromad keltirdi" degan taxminiy, lekin oqilona
   * javob beradi.
   */
  async getSourceDetail(sourceType: InvoiceSourceType, from: Date, to: Date) {
    const payments = await this.prisma.invoicePayment.findMany({
      where: { createdAt: { gte: from, lte: to }, invoice: { sourceType } },
      select: {
        totalAmount: true,
        invoice: {
          select: {
            totalAmount: true,
            items: { select: { description: true, totalPrice: true } },
          },
        },
      },
    });

    const map = new Map<string, { total: number; count: number }>();
    for (const p of payments) {
      const invoiceTotal = Number(p.invoice.totalAmount);
      const paid = Number(p.totalAmount);
      const ratio = invoiceTotal > 0 ? paid / invoiceTotal : 0;

      for (const item of p.invoice.items) {
        const key = item.description;
        const entry = map.get(key) ?? { total: 0, count: 0 };
        entry.total += Number(item.totalPrice) * ratio;
        entry.count += 1;
        map.set(key, entry);
      }
    }

    return Array.from(map.entries())
      .map(([description, v]) => ({ description, ...v }))
      .sort((a, b) => b.total - a.total);
  }
}
