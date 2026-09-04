import { Injectable } from "@nestjs/common";
import { BalanceTxSource, BalanceTxType, InvoiceSourceType, PaymentMethod } from "../../generated/prisma/enums";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenue(from: Date, to: Date) {
    const payments = await this.prisma.invoicePayment.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        cashAmount: true,
        bonusAmount: true,
        totalAmount: true,
        invoice: { select: { sourceType: true, sourceId: true } },
        createdById: true,
        createdBy: { select: { first_name: true, last_name: true } },
      },
    });

    const departmentMap = await this.resolveDepartments(
      payments.map((p) => ({ sourceType: p.invoice.sourceType, sourceId: p.invoice.sourceId })),
    );

    // Naqd to'lovning "to'lov turi" (CASH/CARD/TRANSFER/OTHER) o'zida saqlanmaydi —
    // u shu to'lov uchun yaratilgan INVOICE_PAYMENT DEBIT balance tranzaksiyasida
    // yotadi (invoice.service.ts'dagi pay() bilan bir xil yondashuv).
    const methodTxs = payments.length
      ? await this.prisma.balanceTransaction.findMany({
          where: {
            source: BalanceTxSource.INVOICE_PAYMENT,
            sourceId: { in: payments.map((p) => p.id) },
            type: BalanceTxType.DEBIT,
          },
          select: { sourceId: true, paymentMethod: true },
        })
      : [];
    const methodMap = new Map(methodTxs.map((t) => [t.sourceId as string, t.paymentMethod]));

    const totals = payments.reduce(
      (acc, p) => ({
        cash: acc.cash + Number(p.cashAmount),
        bonus: acc.bonus + Number(p.bonusAmount),
        total: acc.total + Number(p.totalAmount),
      }),
      { cash: 0, bonus: 0, total: 0 },
    );

    const bySourceMap = new Map<InvoiceSourceType, { cash: number; bonus: number; total: number; count: number }>();
    const byMethodMap = new Map<string, { amount: number; count: number }>();
    const byStaffMap = new Map<string, { staffId: string; staffName: string; cash: number; bonus: number; total: number; count: number }>();
    const byDepartmentMap = new Map<
      string,
      { departmentId: string | null; departmentName: string; cash: number; bonus: number; total: number; count: number }
    >();

    for (const p of payments) {
      const sourceKey = p.invoice.sourceType;
      const sourceEntry = bySourceMap.get(sourceKey) ?? { cash: 0, bonus: 0, total: 0, count: 0 };
      sourceEntry.cash += Number(p.cashAmount);
      sourceEntry.bonus += Number(p.bonusAmount);
      sourceEntry.total += Number(p.totalAmount);
      sourceEntry.count += 1;
      bySourceMap.set(sourceKey, sourceEntry);

      const cash = Number(p.cashAmount);
      if (cash > 0) {
        const method = methodMap.get(p.id) ?? PaymentMethod.CASH;
        const methodEntry = byMethodMap.get(method) ?? { amount: 0, count: 0 };
        methodEntry.amount += cash;
        methodEntry.count += 1;
        byMethodMap.set(method, methodEntry);
      }
      const bonus = Number(p.bonusAmount);
      if (bonus > 0) {
        const methodEntry = byMethodMap.get("BONUS") ?? { amount: 0, count: 0 };
        methodEntry.amount += bonus;
        methodEntry.count += 1;
        byMethodMap.set("BONUS", methodEntry);
      }

      const staffEntry = byStaffMap.get(p.createdById) ?? {
        staffId: p.createdById,
        staffName: `${p.createdBy.first_name} ${p.createdBy.last_name}`.trim(),
        cash: 0,
        bonus: 0,
        total: 0,
        count: 0,
      };
      staffEntry.cash += Number(p.cashAmount);
      staffEntry.bonus += Number(p.bonusAmount);
      staffEntry.total += Number(p.totalAmount);
      staffEntry.count += 1;
      byStaffMap.set(p.createdById, staffEntry);

      const dept = departmentMap.get(`${p.invoice.sourceType}:${p.invoice.sourceId}`) ?? null;
      const deptKey = dept?.id ?? "__none__";
      const deptEntry = byDepartmentMap.get(deptKey) ?? {
        departmentId: dept?.id ?? null,
        departmentName: dept?.name ?? "Boshqa",
        cash: 0,
        bonus: 0,
        total: 0,
        count: 0,
      };
      deptEntry.cash += Number(p.cashAmount);
      deptEntry.bonus += Number(p.bonusAmount);
      deptEntry.total += Number(p.totalAmount);
      deptEntry.count += 1;
      byDepartmentMap.set(deptKey, deptEntry);
    }

    const bySource = Array.from(bySourceMap.entries())
      .map(([sourceType, v]) => ({ sourceType, ...v }))
      .sort((a, b) => b.total - a.total);

    const byPaymentMethod = Array.from(byMethodMap.entries())
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.amount - a.amount);

    const byStaff = Array.from(byStaffMap.values()).sort((a, b) => b.total - a.total);

    const byDepartment = Array.from(byDepartmentMap.values()).sort((a, b) => b.total - a.total);

    return {
      from,
      to,
      totals: { ...totals, paymentsCount: payments.length },
      bySource,
      byPaymentMethod,
      byStaff,
      byDepartment,
    };
  }

  /**
   * To'lov qaysi INVOICE manbasidan kelganini (WARD/APPOINTMENT/OPERATION/
   * PROCEDURE_ORDER) haqiqiy Department'ga bog'laydi — shu orqali "shu
   * to'lov qaysi bo'lim daromadiga yozilishi kerak" degan savolga javob
   * beradi. LAB_ORDER va DIAGNOSTIC_ORDER Department emas, balki alohida
   * Laboratory/Diagnostics ierarxiyasiga tegishli bo'lgani uchun (va MANUAL
   * uchun umuman bo'lim yo'q) ular "Boshqa" sifatida guruhlanadi.
   *
   * Natija: `"${sourceType}:${sourceId}"` -> {id, name} xaritasi.
   */
  private async resolveDepartments(
    refs: { sourceType: InvoiceSourceType; sourceId: string }[],
  ): Promise<Map<string, { id: string; name: string }>> {
    const idsByType = new Map<InvoiceSourceType, Set<string>>();
    for (const r of refs) {
      const set = idsByType.get(r.sourceType) ?? new Set<string>();
      set.add(r.sourceId);
      idsByType.set(r.sourceType, set);
    }

    const result = new Map<string, { id: string; name: string }>();

    const wardIds = Array.from(idsByType.get(InvoiceSourceType.WARD) ?? []);
    if (wardIds.length) {
      const wards = await this.prisma.wards.findMany({
        where: { id: { in: wardIds } },
        select: {
          id: true,
          department: { select: { id: true, name: true } },
          room: { select: { department: { select: { id: true, name: true } } } },
        },
      });
      for (const w of wards) {
        const dept = w.department ?? w.room.department;
        if (dept) result.set(`${InvoiceSourceType.WARD}:${w.id}`, dept);
      }
    }

    const appointmentIds = Array.from(idsByType.get(InvoiceSourceType.APPOINTMENT) ?? []);
    if (appointmentIds.length) {
      const appointments = await this.prisma.appointment.findMany({
        where: { id: { in: appointmentIds } },
        select: { id: true, assignment: { select: { department: { select: { id: true, name: true } } } } },
      });
      for (const a of appointments) {
        result.set(`${InvoiceSourceType.APPOINTMENT}:${a.id}`, a.assignment.department);
      }
    }

    const operationIds = Array.from(idsByType.get(InvoiceSourceType.OPERATION) ?? []);
    if (operationIds.length) {
      const operations = await this.prisma.operation.findMany({
        where: { id: { in: operationIds } },
        select: { id: true, department: { select: { id: true, name: true } } },
      });
      for (const o of operations) {
        if (o.department) result.set(`${InvoiceSourceType.OPERATION}:${o.id}`, o.department);
      }
    }

    const procedureOrderIds = Array.from(idsByType.get(InvoiceSourceType.PROCEDURE_ORDER) ?? []);
    if (procedureOrderIds.length) {
      const procedureOrders = await this.prisma.procedureOrder.findMany({
        where: { id: { in: procedureOrderIds } },
        select: { id: true, procedure: { select: { department: { select: { id: true, name: true } } } } },
      });
      for (const po of procedureOrders) {
        result.set(`${InvoiceSourceType.PROCEDURE_ORDER}:${po.id}`, po.procedure.department);
      }
    }

    return result;
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