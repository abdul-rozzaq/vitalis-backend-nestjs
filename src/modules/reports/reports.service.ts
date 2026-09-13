import { Injectable } from "@nestjs/common";
import { BalanceTxSource, BalanceTxType, InvoiceItemSourceType, InvoiceSourceType, PaymentMethod } from "../../generated/prisma/enums";
import { PrismaService } from "../../prisma/prisma.service";

// Master Invoice (sourceType=CASE) qatorlari o'z InvoiceItem.sourceType'ini
// saqlaydi (masalan LAB_SERVICE, WARD_DAILY) — bu xaritalash shu qatorni
// qaysi "klassik" InvoiceSourceType hisobotiga (LAB_ORDER, WARD, ...) tegishli
// deb hisoblash kerakligini bildiradi. Shu orqali Master Invoice'ga to'langan
// pul bitta "CASE" uyumiga tushib qolmay, o'sha eski hisobotlardagi kabi
// manba/bo'lim bo'yicha to'g'ri taqsimlanadi.
const ITEM_SOURCE_TO_INVOICE_SOURCE: Record<InvoiceItemSourceType, InvoiceSourceType> = {
  [InvoiceItemSourceType.APPOINTMENT]: InvoiceSourceType.APPOINTMENT,
  [InvoiceItemSourceType.LAB_SERVICE]: InvoiceSourceType.LAB_ORDER,
  [InvoiceItemSourceType.WARD_DAILY]: InvoiceSourceType.WARD,
  [InvoiceItemSourceType.MANUAL]: InvoiceSourceType.MANUAL,
  [InvoiceItemSourceType.OPERATION]: InvoiceSourceType.OPERATION,
  [InvoiceItemSourceType.DIAGNOSTIC_SERVICE]: InvoiceSourceType.DIAGNOSTIC_ORDER,
  [InvoiceItemSourceType.PROCEDURE_SERVICE]: InvoiceSourceType.PROCEDURE_ORDER,
};

const INVOICE_SOURCE_TO_ITEM_SOURCES: Partial<Record<InvoiceSourceType, InvoiceItemSourceType[]>> = {};
for (const [itemSource, invoiceSource] of Object.entries(ITEM_SOURCE_TO_INVOICE_SOURCE) as [InvoiceItemSourceType, InvoiceSourceType][]) {
  const list = INVOICE_SOURCE_TO_ITEM_SOURCES[invoiceSource] ?? [];
  list.push(itemSource);
  INVOICE_SOURCE_TO_ITEM_SOURCES[invoiceSource] = list;
}

type RevenueSlice = {
  sourceType: InvoiceSourceType;
  sourceId: string;
  cash: number;
  bonus: number;
  total: number;
  paymentId: string;
};

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
        invoice: {
          select: {
            sourceType: true,
            sourceId: true,
            totalAmount: true,
            items: { select: { sourceType: true, sourceId: true, totalPrice: true } },
          },
        },
        createdById: true,
        createdBy: { select: { first_name: true, last_name: true } },
      },
    });

    // Har bir to'lovni "hissa"larga (slice) ajratamiz. Oddiy (PER_SERVICE)
    // invoice uchun bu bitta to'liq hissa — hozirgidek. Master (CASE)
    // invoice uchun esa uning ichidagi itemlar bo'yicha nominal narx
    // ulushiga proporsional (pro-rata) bir nechta hissaga bo'linadi, xuddi
    // getSourceDetail'dagi kabi — shunda bitta Master Invoice ichida
    // aralashgan lab/yotoq/operatsiya xizmatlari o'z manbasiga to'g'ri
    // yoziladi, hammasi bitta "CASE" bandiga tushib qolmaydi.
    const sourceSlices: RevenueSlice[] = [];
    for (const p of payments) {
      if (p.invoice.sourceType !== InvoiceSourceType.CASE) {
        sourceSlices.push({
          sourceType: p.invoice.sourceType,
          sourceId: p.invoice.sourceId,
          cash: Number(p.cashAmount),
          bonus: Number(p.bonusAmount),
          total: Number(p.totalAmount),
          paymentId: p.id,
        });
        continue;
      }

      const invoiceTotal = Number(p.invoice.totalAmount);
      if (invoiceTotal <= 0) continue;

      for (const item of p.invoice.items) {
        const itemTotal = Number(item.totalPrice);
        if (itemTotal === 0) continue;
        const ratio = itemTotal / invoiceTotal;
        sourceSlices.push({
          sourceType: ITEM_SOURCE_TO_INVOICE_SOURCE[item.sourceType] ?? InvoiceSourceType.MANUAL,
          sourceId: item.sourceId ?? p.invoice.sourceId,
          cash: Number(p.cashAmount) * ratio,
          bonus: Number(p.bonusAmount) * ratio,
          total: Number(p.totalAmount) * ratio,
          paymentId: p.id,
        });
      }
    }

    const departmentMap = await this.resolveDepartments(sourceSlices.map((s) => ({ sourceType: s.sourceType, sourceId: s.sourceId })));

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

    // bySource/byDepartment — sliced (item-darajasida to'g'irlangan) ma'lumot
    // asosida. Bitta Master Invoice to'lovi bir nechta bucketga hissa
    // qo'shishi mumkinligi uchun "count" — slice soni emas, shu bucketga
    // hissa qo'shgan DISTINCT to'lovlar soni (paymentIds to'plami orqali).
    const bySourceMap = new Map<InvoiceSourceType, { cash: number; bonus: number; total: number; paymentIds: Set<string> }>();
    const byDepartmentMap = new Map<
      string,
      { departmentId: string | null; departmentName: string; cash: number; bonus: number; total: number; paymentIds: Set<string> }
    >();

    for (const s of sourceSlices) {
      const sourceEntry = bySourceMap.get(s.sourceType) ?? { cash: 0, bonus: 0, total: 0, paymentIds: new Set<string>() };
      sourceEntry.cash += s.cash;
      sourceEntry.bonus += s.bonus;
      sourceEntry.total += s.total;
      sourceEntry.paymentIds.add(s.paymentId);
      bySourceMap.set(s.sourceType, sourceEntry);

      const dept = departmentMap.get(`${s.sourceType}:${s.sourceId}`) ?? null;
      const deptKey = dept?.id ?? "__none__";
      const deptEntry = byDepartmentMap.get(deptKey) ?? {
        departmentId: dept?.id ?? null,
        departmentName: dept?.name ?? "Boshqa",
        cash: 0,
        bonus: 0,
        total: 0,
        paymentIds: new Set<string>(),
      };
      deptEntry.cash += s.cash;
      deptEntry.bonus += s.bonus;
      deptEntry.total += s.total;
      deptEntry.paymentIds.add(s.paymentId);
      byDepartmentMap.set(deptKey, deptEntry);
    }

    // byMethod/byStaff — to'lov usuli/xodim to'lov darajasida, xizmat
    // darajasida emas, shuning uchun bo'linmagan asl `payments` ustida
    // hisoblanadi (aks holda Master Invoice'dagi ko'p itemli to'lov soni
    // sun'iy ko'payib ketardi).
    const byMethodMap = new Map<string, { amount: number; count: number }>();
    const byStaffMap = new Map<string, { staffId: string; staffName: string; cash: number; bonus: number; total: number; count: number }>();
    const byDepartmentMap = new Map<
      string,
      { departmentId: string | null; departmentName: string; cash: number; bonus: number; total: number; count: number }
    >();

    for (const p of payments) {
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
      .map(([sourceType, v]) => ({ sourceType, cash: v.cash, bonus: v.bonus, total: v.total, count: v.paymentIds.size }))
      .sort((a, b) => b.total - a.total);

    const byPaymentMethod = Array.from(byMethodMap.entries())
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.amount - a.amount);

    const byStaff = Array.from(byStaffMap.values()).sort((a, b) => b.total - a.total);

    const byDepartment = Array.from(byDepartmentMap.values())
      .map((v) => ({ departmentId: v.departmentId, departmentName: v.departmentName, cash: v.cash, bonus: v.bonus, total: v.total, count: v.paymentIds.size }))
      .sort((a, b) => b.total - a.total);

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
   * Chaqiruvchi (getRevenue) bu yerga Master Invoice itemlaridan chiqarilgan
   * (mapped) sourceType/sourceId juftliklarini ham uzatishi mumkin — bu
   * metod ularni oddiy PER_SERVICE invoice'lardan farqlamaydi, chunki
   * ward/appointment/operation/procedureOrder jadvallari o'zi qaysi
   * invoice'ga tegishli ekanidan bexabar.
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
        invoice: {
          select: {
            sourceType: true,
            totalAmount: true,
            items: { select: { sourceType: true, totalPrice: true } },
          },
        },
      },
    });

    const monthMap = new Map<string, Map<InvoiceSourceType, number>>();
    for (const p of payments) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const bySource = monthMap.get(key) ?? new Map<InvoiceSourceType, number>();

      if (p.invoice.sourceType !== InvoiceSourceType.CASE) {
        bySource.set(p.invoice.sourceType, (bySource.get(p.invoice.sourceType) ?? 0) + Number(p.totalAmount));
      } else {
        // Master Invoice — xuddi getRevenue'dagi kabi itemlar bo'yicha
        // pro-rata taqsimlaymiz, bitta "CASE" bandiga yig'ib qo'ymaymiz.
        const invoiceTotal = Number(p.invoice.totalAmount);
        if (invoiceTotal > 0) {
          for (const item of p.invoice.items) {
            const ratio = Number(item.totalPrice) / invoiceTotal;
            const mapped = ITEM_SOURCE_TO_INVOICE_SOURCE[item.sourceType] ?? InvoiceSourceType.MANUAL;
            bySource.set(mapped, (bySource.get(mapped) ?? 0) + Number(p.totalAmount) * ratio);
          }
        }
      }

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
   *
   * Master Invoice'lar (sourceType=CASE) ham hisobga olinadi: so'ralgan
   * `sourceType`ga mos keladigan InvoiceItem.sourceType'ga ega itemlari bor
   * Master Invoice to'lovlari ham qo'shiladi, lekin faqat o'sha kategoriyaga
   * tegishli itemlari bilan (masalan LAB_ORDER so'ralganda, xuddi shu Master
   * Invoice ichidagi WARD_DAILY qatorlari bu yerga kirmaydi).
   */
  async getSourceDetail(sourceType: InvoiceSourceType, from: Date, to: Date) {
    const matchingItemSourceTypes = INVOICE_SOURCE_TO_ITEM_SOURCES[sourceType] ?? [];

    const payments = await this.prisma.invoicePayment.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        invoice: {
          OR: [
            { sourceType },
            ...(matchingItemSourceTypes.length
              ? [{ sourceType: InvoiceSourceType.CASE, items: { some: { sourceType: { in: matchingItemSourceTypes } } } }]
              : []),
          ],
        },
      },
      select: {
        totalAmount: true,
        invoice: {
          select: {
            sourceType: true,
            totalAmount: true,
            items: { select: { description: true, totalPrice: true, sourceType: true } },
          },
        },
      },
    });

    const map = new Map<string, { total: number; count: number }>();
    for (const p of payments) {
      const invoiceTotal = Number(p.invoice.totalAmount);
      const paid = Number(p.totalAmount);
      const ratio = invoiceTotal > 0 ? paid / invoiceTotal : 0;

      const relevantItems =
        p.invoice.sourceType === InvoiceSourceType.CASE
          ? p.invoice.items.filter((i) => matchingItemSourceTypes.includes(i.sourceType))
          : p.invoice.items;

      for (const item of relevantItems) {
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
