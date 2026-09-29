import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  BalanceTxSource,
  BalanceTxType,
  CaseBillingMode,
  InvoiceItemSourceType,
  InvoiceSourceType,
  InvoiceStatus,
  PaymentMethod,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { BalanceService } from '../balance/balance.service';
import { allocateJournal } from './journal-allocation';
import { IssueJournalInvoicesDto } from './dto/issue-journal-invoices.dto';
import { PayJournalDto } from './dto/pay-journal.dto';
import { PayJournalSelectionDto } from './dto/pay-journal-selection.dto';
import { JournalIssueMode } from './dto/issue-journal-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

type PrismaTx = Prisma.TransactionClient;

export type MasterInvoiceItemInput = {
  description: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  sourceType: InvoiceItemSourceType;
  sourceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

const INVOICE_INCLUDE = {
  items: { orderBy: { createdAt: "asc" as const } },
  payments: { orderBy: { createdAt: "desc" as const } },
  patient: true,
} as const;

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceService: BalanceService,
  ) {}

  async listInvoices(params: {
    status?: InvoiceStatus;
    dateFrom?: Date;
    dateTo?: Date;
    sourceType?: InvoiceSourceType[];
    patientId?: string;
    doctorId?: string;
    operationTypeId?: string;
    operationDoctorId?: string;
    patientSearch?: string;
    amountMin?: number;
    amountMax?: number;
    invoiceKind?: 'SINGLE' | 'JOURNAL';
  }) {
    const where: Prisma.InvoiceWhereInput = { isJournal: false, journalId: null };
    if (params.status) where.status = params.status;
    if (params.patientId) where.patientId = params.patientId;
    if (params.patientSearch) {
      where.patient = {
        OR: [
          { first_name: { contains: params.patientSearch, mode: 'insensitive' } },
          { last_name: { contains: params.patientSearch, mode: 'insensitive' } },
        ],
      };
    }
    if (params.amountMin !== undefined || params.amountMax !== undefined) {
      where.totalAmount = {};
      if (params.amountMin !== undefined) (where.totalAmount as any).gte = params.amountMin;
      if (params.amountMax !== undefined) (where.totalAmount as any).lte = params.amountMax;
    }
    if (params.sourceType && params.sourceType.length > 0) {
      where.sourceType =
        params.sourceType.length === 1
          ? params.sourceType[0]
          : { in: params.sourceType };
    }
    if (params.operationTypeId || params.operationDoctorId) {
      const operations = await this.prisma.operation.findMany({
        where: {
          ...(params.operationTypeId
            ? { operationTypeId: params.operationTypeId }
            : {}),
          ...(params.operationDoctorId
            ? { surgeons: { some: { surgeonId: params.operationDoctorId } } }
            : {}),
        },
        select: { id: true },
      });

      const operationIds = operations.map((operation) => operation.id);
      where.sourceType = InvoiceSourceType.OPERATION;
      where.sourceId = {
        in: operationIds.length > 0 ? operationIds : ['__none__'],
      };
    } else if (params.doctorId) {
      const appointments = await this.prisma.appointment.findMany({
        where: { assignment: { userId: params.doctorId } },
        select: { id: true },
      });
      const appointmentIds = appointments.map((a) => a.id);
      where.sourceType = InvoiceSourceType.APPOINTMENT;
      where.sourceId = { in: appointmentIds.length > 0 ? appointmentIds : ['__none__'] };
    }
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) (where.createdAt as any).gte = params.dateFrom;
      if (params.dateTo) (where.createdAt as any).lte = params.dateTo;
    }
    const ordinary = params.invoiceKind === 'JOURNAL' ? [] : await this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: INVOICE_INCLUDE,
    });

    // A journal's child invoices are payment records. The list shows their
    // parent once, while ordinary one-time invoices remain separate rows.
    const includeJournals = params.invoiceKind !== 'SINGLE'
      && !params.doctorId && !params.operationTypeId && !params.operationDoctorId
      && (!params.sourceType?.length || params.sourceType.includes(InvoiceSourceType.OPERATION));
    if (!includeJournals) return ordinary.map(invoice => ({ ...invoice, invoiceKind: 'SINGLE' as const }));

    const journalWhere: Prisma.InvoiceWhereInput = {
      isJournal: true,
      status: { not: InvoiceStatus.CANCELLED },
    };
    if (params.patientId) journalWhere.patientId = params.patientId;
    if (params.patientSearch) journalWhere.patient = where.patient;
    if (params.dateFrom || params.dateTo) journalWhere.createdAt = where.createdAt;

    const journals = await this.prisma.invoice.findMany({
      where: journalWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        ...INVOICE_INCLUDE,
        issuedInvoices: {
          where: { status: { not: InvoiceStatus.CANCELLED } },
          select: { paidCash: true, paidBonus: true },
        },
      },
    });
    const cases = await this.prisma.patientCase.findMany({
      where: { id: { in: journals.map(journal => journal.sourceId) } },
      select: {
        id: true,
        wards: {
          orderBy: { checkIn: 'asc' },
          select: {
            department: { select: { name: true } },
            room: { select: { department: { select: { name: true } } } },
          },
        },
        steps: {
          orderBy: { createdAt: 'asc' },
          select: {
            operation: {
              select: {
                department: { select: { name: true } },
                operationType: { select: { department: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });
    const departmentByCase = new Map(cases.map(patientCase => [
      patientCase.id,
      patientCase.wards.map(ward => ward.department?.name ?? ward.room.department?.name).find(Boolean)
        ?? patientCase.steps.map(step => step.operation?.department?.name ?? step.operation?.operationType?.department?.name).find(Boolean)
        ?? null,
    ]));
    const grouped = journals.map(({ issuedInvoices, ...journal }) => {
      const paidCash = issuedInvoices.reduce((sum, invoice) => sum.add(invoice.paidCash), new Prisma.Decimal(0));
      const paidBonus = issuedInvoices.reduce((sum, invoice) => sum.add(invoice.paidBonus), new Prisma.Decimal(0));
      const paid = paidCash.add(paidBonus);
      const status = journal.totalAmount.lte(0) ? InvoiceStatus.DRAFT
        : paid.gte(journal.totalAmount) ? InvoiceStatus.PAID
        : paid.gt(0) ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.ISSUED;
      return {
        ...journal,
        paidCash,
        paidBonus,
        status,
        sourceType: InvoiceSourceType.OPERATION,
        departmentName: departmentByCase.get(journal.sourceId) ?? null,
        invoiceKind: 'JOURNAL' as const,
      };
    }).filter(journal =>
      (!params.status || journal.status === params.status)
      && (params.amountMin === undefined || Number(journal.totalAmount) >= params.amountMin)
      && (params.amountMax === undefined || Number(journal.totalAmount) <= params.amountMax)
    );

    return [...ordinary.map(invoice => ({ ...invoice, invoiceKind: 'SINGLE' as const })), ...grouped]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listOperationPaymentDoctors(operationTypeId?: string) {
    const rows = await this.prisma.operationSurgeon.findMany({
      where: operationTypeId
        ? { operation: { operationTypeId } }
        : undefined,
      select: {
        surgeon: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
      },
      orderBy: { surgeon: { first_name: 'asc' } },
    });

    const unique = new Map<string, (typeof rows)[number]['surgeon']>();
    for (const row of rows) {
      unique.set(row.surgeon.id, row.surgeon);
    }

    return Array.from(unique.values());
  }

  async listPayments(params: {
    dateFrom?: Date;
    dateTo?: Date;
    patientId?: string;
    patientSearch?: string;
    amountMin?: number;
    amountMax?: number;
    invoiceSourceType?: InvoiceSourceType[];
    paymentMethod?: PaymentMethod[];
    operationTypeId?: string;
    doctorId?: string;
  }) {
    const where: Prisma.InvoicePaymentWhereInput = {};

    if (
      params.patientId ||
      params.patientSearch ||
      (params.invoiceSourceType && params.invoiceSourceType.length > 0) ||
      params.operationTypeId ||
      params.doctorId
    ) {
      where.invoice = {};

      if (params.patientId) {
        where.invoice.patientId = params.patientId;
      }

      if (params.patientSearch) {
        where.invoice.patient = {
          OR: [
            { first_name: { contains: params.patientSearch, mode: 'insensitive' } },
            { last_name: { contains: params.patientSearch, mode: 'insensitive' } },
          ],
        };
      }

      if (params.invoiceSourceType && params.invoiceSourceType.length > 0) {
        where.invoice.sourceType =
          params.invoiceSourceType.length === 1
            ? params.invoiceSourceType[0]
            : { in: params.invoiceSourceType };
      }

      // Operatsiya bo'yicha filter berilsa, payment faqat OPERATION
      // manbasidan olinadi. sourceId esa Invoice'dagi individual
      // operation ID'ga teng. Shu sababli avval mos operatsiyalarni
      // topib, keyin invoice sourceId bo'yicha cheklaymiz.
      if (params.operationTypeId || params.doctorId) {
        const operationWhere: Prisma.OperationWhereInput = {};

        if (params.operationTypeId) {
          operationWhere.operationTypeId = params.operationTypeId;
        }

        if (params.doctorId) {
          operationWhere.surgeons = {
            some: { surgeonId: params.doctorId },
          };
        }

        const operations = await this.prisma.operation.findMany({
          where: operationWhere,
          select: { id: true },
        });

        const operationIds = operations.map((operation) => operation.id);

        where.invoice.sourceType = InvoiceSourceType.OPERATION;
        where.invoice.sourceId = {
          in: operationIds.length > 0 ? operationIds : ['__none__'],
        };
      }
    }

    if (params.amountMin !== undefined || params.amountMax !== undefined) {
      where.totalAmount = {};
      if (params.amountMin !== undefined) (where.totalAmount as any).gte = params.amountMin;
      if (params.amountMax !== undefined) (where.totalAmount as any).lte = params.amountMax;
    }

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) (where.createdAt as any).gte = params.dateFrom;
      if (params.dateTo) (where.createdAt as any).lte = params.dateTo;
    }

    if (params.paymentMethod && params.paymentMethod.length > 0) {
      const matchingTxs = await this.prisma.balanceTransaction.findMany({
        where: {
          source: BalanceTxSource.INVOICE_PAYMENT,
          paymentMethod: { in: params.paymentMethod },
        },
        select: { sourceId: true },
      });
      where.id = { in: matchingTxs.map(tx => tx.sourceId).filter(Boolean) as string[] };
    }

    const payments = await this.prisma.invoicePayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: {
          include: {
            patient: true,
            items: true,
          },
        },
        createdBy: true,
      },
    });

    if (payments.length === 0) return [];

    const balanceTxs = await this.prisma.balanceTransaction.findMany({
      where: {
        source: BalanceTxSource.INVOICE_PAYMENT,
        sourceId: { in: payments.map(p => p.id) },
      },
      select: { sourceId: true, paymentMethod: true },
    });
    const methodMap = new Map(balanceTxs.map(tx => [tx.sourceId, tx.paymentMethod]));

    return payments.map(p => ({
      ...p,
      paymentMethod: methodMap.get(p.id) || null,
    }));
  }

  async updatePaymentMethod(paymentId: string, paymentMethod: PaymentMethod) {
    const txs = await this.prisma.balanceTransaction.findMany({
      where: { source: BalanceTxSource.INVOICE_PAYMENT, sourceId: paymentId }
    });
    
    if (txs.length === 0) {
      throw new NotFoundException("To'lov tranzaksiyasi topilmadi");
    }

    await this.prisma.balanceTransaction.updateMany({
      where: { source: BalanceTxSource.INVOICE_PAYMENT, sourceId: paymentId, type: BalanceTxType.DEBIT },
      data: { paymentMethod }
    });
    
    return { success: true };
  }

  async createInvoice(params: {
    patientId: string;
    sourceType: InvoiceSourceType;
    sourceId: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      sourceType: InvoiceItemSourceType;
      sourceId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }>;
    dueDate?: Date;
    note?: string;
    staffId: string;
  }) {
    if (params.sourceType === InvoiceSourceType.CASE) throw new BadRequestException('Jurnal orqali invois yarating');
    const totalAmount = params.items.reduce((sum, item) => {
      return sum.add(item.unitPrice.mul(item.quantity));
    }, new Prisma.Decimal(0));

    return this.prisma.invoice.create({
      data: {
        patientId: params.patientId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        status: InvoiceStatus.ISSUED,
        totalAmount,
        dueDate: params.dueDate,
        note: params.note,
        createdById: params.staffId,
        items: {
          create: params.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice.mul(item.quantity),
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            dateFrom: item.dateFrom,
            dateTo: item.dateTo,
          })),
        },
      },
      include: { items: true, patient: true },
    });
  }

  /** Append services to the non-payable journal. Issued invoices are immutable snapshots. */
  async billCaseService(
    tx: PrismaTx,
    params: {
      caseId: string;
      patientId: string;
      items: MasterInvoiceItemInput[];
      createdById: string;
    },
  ) {
    if (tx === this.prisma) {
      return this.prisma.$transaction(client => this.billCaseService(client, params));
    }
    await tx.$queryRaw`SELECT id FROM patient_cases WHERE id = ${params.caseId} FOR UPDATE`;
    if (params.items.length === 0) return null;

    const patientCase = await tx.patientCase.findUnique({
      where: { id: params.caseId },
      select: { billingMode: true },
    });
    if (!patientCase || patientCase.billingMode !== CaseBillingMode.MASTER) {
      return null;
    }

    const itemsData = params.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice.mul(item.quantity),
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      dateFrom: item.dateFrom,
      dateTo: item.dateTo,
    }));
    const addedTotal = itemsData.reduce((sum, i) => sum.add(i.totalPrice), new Prisma.Decimal(0));

    const existing = await tx.invoice.findFirst({
      where: {
        sourceType: InvoiceSourceType.CASE,
        sourceId: params.caseId,
        isJournal: true,
        status: { not: InvoiceStatus.CANCELLED },
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    if (existing) {
      return this.appendToMasterInvoice(tx, existing, itemsData, addedTotal);
    }

    // Recovery for older cases without a journal header.
    return await tx.invoice.create({
      data: {
        patientId: params.patientId,
        sourceType: InvoiceSourceType.CASE,
        sourceId: params.caseId,
        isJournal: true,
        status: InvoiceStatus.DRAFT,
        totalAmount: addedTotal,
        createdById: params.createdById,
        items: { create: itemsData },
      },
      include: { items: true },
    });
  }

  private async appendToMasterInvoice(
    tx: PrismaTx,
    invoice: { id: string; status: InvoiceStatus; totalAmount: Prisma.Decimal; paidCash: Prisma.Decimal; paidBonus: Prisma.Decimal },
    itemsData: Array<{
      description: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      sourceType: InvoiceItemSourceType;
      sourceId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }>,
    addedTotal: Prisma.Decimal,
  ) {
    return tx.invoice.update({
      where: { id: invoice.id },
      data: {
        totalAmount: { increment: addedTotal },
        status: InvoiceStatus.DRAFT,
        items: { create: itemsData },
      },
      include: { items: true },
    });
  }

  async getJournals(caseIds: string[]) {
    const journals = await this.prisma.invoice.findMany({
      where: { isJournal: true, sourceId: { in: caseIds }, status: { not: InvoiceStatus.CANCELLED } },
      include: {
        items: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include: { allocations: { select: { totalPrice: true, invoice: { select: { status: true, totalAmount: true, paidCash: true, paidBonus: true } } } } },
        },
        issuedInvoices: { orderBy: { createdAt: 'desc' }, include: INVOICE_INCLUDE },
      },
    });
    const [operations, labOrders] = await Promise.all([
      this.prisma.operation.findMany({
        where: { caseStep: { caseId: { in: caseIds } } },
        select: { id: true, items: { select: { id: true } } },
      }),
      this.prisma.labOrder.findMany({
        where: { caseStep: { caseId: { in: caseIds } } },
        select: { id: true, caseStep: { select: { caseId: true } }, items: { select: { serviceId: true } } },
      }),
    ]);
    const operationLinks = new Map<string, string>();
    for (const operation of operations) {
      operationLinks.set(operation.id, `/operations/${operation.id}`);
      for (const item of operation.items) operationLinks.set(item.id, `/operations/${operation.id}`);
    }
    const detailHref = (caseId: string, item: { sourceType: string; sourceId: string | null }) => {
      if (!item.sourceId) return null;
      if (item.sourceType === 'OPERATION') return operationLinks.get(item.sourceId) ?? null;
      if (item.sourceType === 'APPOINTMENT') return `/appointments/${item.sourceId}`;
      if (item.sourceType === 'LAB_SERVICE') {
        const matches = labOrders.filter(order => order.caseStep.caseId === caseId && order.items.some(service => service.serviceId === item.sourceId));
        if (matches.length === 1) return `/lab/${matches[0].id}/results`;
      }
      return null;
    };
    return journals.map(journal => {
      const active = journal.issuedInvoices.filter(i => i.status !== InvoiceStatus.CANCELLED);
      const billedAmount = active.reduce((sum, i) => sum.add(i.totalAmount), new Prisma.Decimal(0));
      const paidCash = active.reduce((sum, i) => sum.add(i.paidCash), new Prisma.Decimal(0));
      const paidBonus = active.reduce((sum, i) => sum.add(i.paidBonus), new Prisma.Decimal(0));
      return {
        ...journal, paidCash, paidBonus, billedAmount,
        unbilledAmount: Prisma.Decimal.max(0, journal.totalAmount.sub(billedAmount)),
        unpaidAmount: Prisma.Decimal.max(0, billedAmount.sub(paidCash).sub(paidBonus)),
        items: journal.items.map(({ allocations, ...item }) => {
          const activeAllocations = allocations.filter(allocation => allocation.invoice.status !== InvoiceStatus.CANCELLED);
          const billed = activeAllocations.reduce((sum, a) => sum.add(a.totalPrice), new Prisma.Decimal(0));
          const paid = activeAllocations.reduce((sum, allocation) => {
            const child = allocation.invoice;
            if (child.totalAmount.lte(0)) return sum;
            const ratio = Prisma.Decimal.min(1, child.paidCash.add(child.paidBonus).div(child.totalAmount));
            return sum.add(allocation.totalPrice.mul(ratio));
          }, new Prisma.Decimal(0));
          return {
            ...item,
            detailHref: detailHref(journal.sourceId, item),
            billedAmount: billed,
            remainingAmount: Prisma.Decimal.max(0, item.totalPrice.sub(billed)),
            paidAmount: paid,
            isPaid: paid.greaterThanOrEqualTo(item.totalPrice),
            canCancel: item.sourceType === InvoiceItemSourceType.MANUAL && allocations.length === 0,
          };
        }),
      };
    });
  }

  async issueJournalInvoices(caseId: string, dto: IssueJournalInvoicesDto, staffId: string) {
    return this.prisma.$transaction(tx => this.issueJournalInvoicesTx(tx, caseId, dto, staffId));
  }

  async payJournal(caseId: string, dto: PayJournalDto, staffId: string) {
    return this.prisma.$transaction(async tx => {
      const invoices = await this.issueJournalInvoicesTx(tx, caseId, dto, staffId);
      // A retry with the same requestId returns the already paid invoices.
      if (invoices.every(invoice => invoice.status === InvoiceStatus.PAID)) return invoices;
      if (invoices.some(invoice => invoice.status !== InvoiceStatus.ISSUED)) {
        throw new BadRequestException('Invois holati to‘lovga mos emas');
      }
      const paid = [];
      for (const invoice of invoices) {
        paid.push(await this.payInvoiceTx(tx, {
          invoiceId: invoice.id,
          cashAmount: invoice.totalAmount,
          bonusAmount: new Prisma.Decimal(0),
          staffId,
          paymentMethod: dto.paymentMethod,
          topUp: true,
          note: dto.note,
        }));
      }
      return paid;
    }, { timeout: 20000 });
  }

  async payJournalSelection(caseId: string, dto: PayJournalSelectionDto, staffId: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM invoices WHERE "sourceId" = ${caseId} AND "isJournal" = true FOR UPDATE`;
      const journal = await tx.invoice.findFirst({
        where: { sourceId: caseId, isJournal: true, status: { not: InvoiceStatus.CANCELLED } },
        include: { items: { include: { allocations: { where: { invoice: { status: { not: InvoiceStatus.CANCELLED } } }, select: { totalPrice: true } } } } },
      });
      if (!journal) throw new NotFoundException('Jurnal topilmadi');
      const previous = await tx.auditLog.findFirst({
        where: { entity: 'JournalPaySelection', entityId: dto.requestId, action: journal.id, userId: staffId },
      });
      if (previous) {
        const saved = previous.newValues as { invoiceIds: string[] };
        return tx.invoice.findMany({ where: { id: { in: saved.invoiceIds } }, include: INVOICE_INCLUDE });
      }
      const selected = new Set(dto.itemIds);
      if (journal.items.filter(item => selected.has(item.id)).length !== selected.size) {
        throw new BadRequestException('Tanlangan xizmat jurnalga tegishli emas');
      }
      const outstanding = await tx.invoice.findMany({
        where: { journalId: journal.id, status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] } },
        orderBy: { createdAt: 'asc' },
        include: { items: { select: { journalItemId: true } } },
      });
      const selectedInvoices = outstanding.filter(invoice => invoice.items.some(item => item.journalItemId && selected.has(item.journalItemId)));
      if (selectedInvoices.some(invoice => invoice.items.some(item => !item.journalItemId || !selected.has(item.journalItemId)))) {
        throw new BadRequestException('Bir hisobga birlashtirilgan xizmatlarni birga tanlang');
      }
      const availableIds = journal.items.filter(item => selected.has(item.id) &&
        item.totalPrice.gt(item.allocations.reduce((sum, allocation) => sum.add(allocation.totalPrice), new Prisma.Decimal(0))),
      ).map(item => item.id);
      const existingTotal = selectedInvoices.reduce((sum, invoice) =>
        sum.add(invoice.totalAmount.sub(invoice.paidCash).sub(invoice.paidBonus)), new Prisma.Decimal(0));
      const unbilledTotal = journal.items.filter(item => availableIds.includes(item.id)).reduce((sum, item) =>
        sum.add(item.totalPrice.sub(item.allocations.reduce((part, allocation) => part.add(allocation.totalPrice), new Prisma.Decimal(0)))), new Prisma.Decimal(0));
      let remainingPayment = new Prisma.Decimal(dto.amount);
      if (remainingPayment.lte(0) || remainingPayment.gt(existingTotal.add(unbilledTotal))) {
        throw new BadRequestException("To'lov summasi tanlangan xizmatlar qoldig'idan oshmasligi kerak");
      }
      const issued = availableIds.length
        ? await this.issueJournalInvoicesTx(tx, caseId, {
          mode: JournalIssueMode.ITEMS,
          itemIds: availableIds,
          requestId: dto.requestId,
        }, staffId)
        : [];
      const paid = [];
      for (const invoice of [...selectedInvoices, ...issued]) {
        if (remainingPayment.lte(0)) break;
        const due = invoice.totalAmount.sub(invoice.paidCash).sub(invoice.paidBonus);
        if (due.lte(0)) continue;
        const amount = Prisma.Decimal.min(due, remainingPayment);
        paid.push(await this.payInvoiceTx(tx, {
          invoiceId: invoice.id,
          cashAmount: amount,
          bonusAmount: new Prisma.Decimal(0),
          staffId,
          paymentMethod: dto.paymentMethod,
          topUp: true,
        }));
        remainingPayment = remainingPayment.sub(amount);
      }
      if (remainingPayment.gt(0)) throw new BadRequestException("To'lov summasini taqsimlab bo'lmadi");
      await tx.auditLog.create({ data: {
        userId: staffId,
        entity: 'JournalPaySelection',
        entityId: dto.requestId,
        action: journal.id,
        newValues: { invoiceIds: paid.map(invoice => invoice.id) },
      } });
      return paid;
    }, { timeout: 30000 });
  }

  private async issueJournalInvoicesTx(tx: PrismaTx, caseId: string, dto: IssueJournalInvoicesDto, staffId: string) {
      // Serialize allocation and cancellation for this journal. The second request
      // reads the first request's committed allocations after acquiring the lock.
      await tx.$queryRaw`SELECT id FROM invoices WHERE "sourceId" = ${caseId} AND "isJournal" = true FOR UPDATE`;
      const journal = await tx.invoice.findFirst({
        where: { sourceId: caseId, isJournal: true, status: InvoiceStatus.DRAFT },
        include: {
          items: {
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            include: { allocations: { where: { invoice: { status: { not: InvoiceStatus.CANCELLED } } } } },
          },
        },
      });
      if (!journal) throw new NotFoundException('Jurnal topilmadi');
      const previous = await tx.auditLog.findFirst({
        where: { entity: 'JournalInvoiceRequest', entityId: dto.requestId, action: journal.id, userId: staffId },
      });
      if (previous) {
        const saved = previous.newValues as { invoiceIds: string[] };
        return tx.invoice.findMany({ where: { id: { in: saved.invoiceIds } }, include: INVOICE_INCLUDE });
      }
      const available = journal.items.map(item => ({
        ...item,
        remainingAmount: item.totalPrice.sub(item.allocations.reduce((sum, a) => sum.add(a.totalPrice), new Prisma.Decimal(0))),
      }));
      const batches = allocateJournal(available, dto);
      const created = [];
      for (const batch of batches) {
        const items = batch.map(allocation => {
          const original = journal.items.find(i => i.id === allocation.itemId)!;
          const full = allocation.amount.eq(original.totalPrice);
          return {
            journalItemId: original.id,
            description: original.description,
            quantity: full ? original.quantity : 1,
            unitPrice: full ? original.unitPrice : allocation.amount,
            totalPrice: allocation.amount,
            sourceType: original.sourceType,
            sourceId: original.sourceId,
            dateFrom: original.dateFrom,
            dateTo: original.dateTo,
          };
        });
        created.push(await tx.invoice.create({
          data: {
            patientId: journal.patientId, journalId: journal.id,
            sourceType: InvoiceSourceType.CASE, sourceId: caseId,
            status: InvoiceStatus.ISSUED, createdById: staffId,
            totalAmount: batch.reduce((sum, a) => sum.add(a.amount), new Prisma.Decimal(0)),
            items: { create: items },
          },
          include: INVOICE_INCLUDE,
        }));
      }
      await tx.auditLog.create({
        data: {
          userId: staffId, entity: 'JournalInvoiceRequest', entityId: dto.requestId, action: journal.id,
          newValues: { mode: dto.mode, invoiceIds: created.map(i => i.id) },
        },
      });
      return created;
  }

  async payInvoice(params: {
    invoiceId: string;
    cashAmount: Prisma.Decimal;
    bonusAmount: Prisma.Decimal;
    staffId: string;
    note?: string;
    paymentMethod?: PaymentMethod;
    topUp?: boolean;
  }) {
    return this.prisma.$transaction(tx => this.payInvoiceTx(tx, params));
  }

  private async payInvoiceTx(tx: PrismaTx, params: {
    invoiceId: string;
    cashAmount: Prisma.Decimal;
    bonusAmount: Prisma.Decimal;
    staffId: string;
    note?: string;
    paymentMethod?: PaymentMethod;
    topUp?: boolean;
  }) {
      const ref = await tx.invoice.findUnique({ where: { id: params.invoiceId }, select: { journalId: true } });
      if (ref?.journalId) await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${ref.journalId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${params.invoiceId} FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({
        where: { id: params.invoiceId },
      });

      if (!invoice) {
        throw new BadRequestException('Invoice not found');
      }
      if (
        invoice.status === InvoiceStatus.PAID ||
        invoice.status === InvoiceStatus.CANCELLED
      ) {
        throw new BadRequestException(`Invoice is already ${invoice.status}`);
      }

      if (invoice.isJournal) throw new BadRequestException('Jurnaldan avval alohida invois yarating');
      const totalPayment = params.cashAmount.add(params.bonusAmount);
      if (invoice.journalId && (params.cashAmount.lt(0) || params.bonusAmount.lt(0) || totalPayment.lte(0) ||
          totalPayment.gt(invoice.totalAmount.sub(invoice.paidCash).sub(invoice.paidBonus)))) {
        throw new BadRequestException("To'lov summasi invois qoldig'iga mos emas");
      }

      // "To'g'ridan-to'g'ri" to'lov: naqd summani avval balansga tashlab,
      // keyin darhol shu tranzaksiya ichida sarflaymiz — ikkalasi ham bir xil
      // paymentMethod bilan belgilanadi va bitta atomic operatsiya bo'ladi.
      if (params.topUp && params.paymentMethod && params.cashAmount.greaterThan(0)) {
        await this.balanceService.depositInTx(tx, {
          patientId: invoice.patientId,
          amount: params.cashAmount,
          paymentMethod: params.paymentMethod,
          note: params.note,
          staffId: params.staffId,
        });
      }

      const invoicePayment = await tx.invoicePayment.create({
        data: {
          invoiceId: invoice.id,
          cashAmount: params.cashAmount,
          bonusAmount: params.bonusAmount,
          totalAmount: totalPayment,
          note: params.note,
          createdById: params.staffId,
        },
      });

      await this.balanceService.charge(tx, {
        patientId: invoice.patientId,
        totalAmount: totalPayment,
        cashToUse: params.cashAmount,
        bonusToUse: params.bonusAmount,
        source: BalanceTxSource.INVOICE_PAYMENT,
        sourceId: invoicePayment.id,
        paymentMethod: params.paymentMethod,
        note: params.note,
        staffId: params.staffId,
      });

      const newPaidCash = invoice.paidCash.add(params.cashAmount);
      const newPaidBonus = invoice.paidBonus.add(params.bonusAmount);
      const newStatus = newPaidCash
        .add(newPaidBonus)
        .greaterThanOrEqualTo(invoice.totalAmount)
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidCash: newPaidCash,
          paidBonus: newPaidBonus,
          status: newStatus,
        },
        include: INVOICE_INCLUDE,
      });

      const paymentTransaction = await tx.balanceTransaction.findFirst({
        where: {
          source: BalanceTxSource.INVOICE_PAYMENT,
          sourceId: invoicePayment.id,
          type: BalanceTxType.DEBIT,
        },
        select: { paymentMethod: true },
      });

      return {
        ...updatedInvoice,
        payments: updatedInvoice.payments.map((payment) =>
          payment.id === invoicePayment.id
            ? { ...payment, paymentMethod: paymentTransaction?.paymentMethod ?? params.paymentMethod ?? null }
            : payment,
        ),
      };
  }

  async getInvoice(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
  }

  async getInvoiceBySource(sourceType: InvoiceSourceType, sourceId: string) {
    return this.prisma.invoice.findFirst({
      where: { sourceType, sourceId },
      orderBy: { createdAt: 'desc' },
      include: INVOICE_INCLUDE,
    });
  }

  /**
   * Bitta manba (masalan, bitta operatsiya) uchun bir nechta invois
   * bo'lishi mumkin bo'lgan hollarda ishlatiladi — masalan, operatsiya
   * narxi bir nechta invoisga bo'lib-bo'lib chiqarilganda.
   */
  async getInvoicesBySource(sourceType: InvoiceSourceType, sourceId: string) {
    return this.prisma.invoice.findMany({
      where: { sourceType, sourceId },
      orderBy: { createdAt: 'asc' },
      include: INVOICE_INCLUDE,
    });
  }

  /**
   * Operatsiya tahrirlanganda (masalan, boshlangandan keyin yangi xizmat
   * qo'shilganda) shu operatsiyaga tegishli invoice'ni yangi holatga
   * moslashtiradi. Faqat sourceType=OPERATION bo'lgan item'lar
   * almashtiriladi, boshqa manbalar (masalan, laboratoriya) tegilmaydi.
   */
  async syncOperationInvoice(
    operationId: string,
    operationItems: Array<{
      description: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      sourceId: string;
    }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          sourceType: InvoiceSourceType.OPERATION,
          sourceId: operationId,
        },
        include: { items: true },
      });

      if (!invoice || invoice.status === InvoiceStatus.CANCELLED) {
        return invoice;
      }

      const otherItems = invoice.items.filter(
        (i) => i.sourceType !== InvoiceItemSourceType.OPERATION,
      );
      const otherTotal = otherItems.reduce(
        (sum, i) => sum.add(i.totalPrice),
        new Prisma.Decimal(0),
      );

      const operationTotal = operationItems.reduce(
        (sum, i) => sum.add(i.unitPrice.mul(i.quantity)),
        new Prisma.Decimal(0),
      );

      const newTotal = otherTotal.add(operationTotal);

      await tx.invoiceItem.deleteMany({
        where: {
          invoiceId: invoice.id,
          sourceType: InvoiceItemSourceType.OPERATION,
        },
      });

      if (operationItems.length > 0) {
        await tx.invoiceItem.createMany({
          data: operationItems.map((item) => ({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice.mul(item.quantity),
            sourceType: InvoiceItemSourceType.OPERATION,
            sourceId: item.sourceId,
          })),
        });
      }

      const paidTotal = invoice.paidCash.add(invoice.paidBonus);
      const newStatus =
        newTotal.greaterThan(0) && paidTotal.greaterThanOrEqualTo(newTotal)
          ? InvoiceStatus.PAID
          : paidTotal.greaterThan(0)
            ? InvoiceStatus.PARTIALLY_PAID
            : InvoiceStatus.ISSUED;

      return tx.invoice.update({
        where: { id: invoice.id },
        data: { totalAmount: newTotal, status: newStatus },
        include: INVOICE_INCLUDE,
      });
    });
  }

  async cancelInvoice(id: string) {
    return this.updateInvoice(id, { status: InvoiceStatus.CANCELLED });
  }

  async getPatientInvoices(
    patientId: string,
    params: { page: number; limit: number; sourceType?: InvoiceSourceType[] },
  ) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.InvoiceWhereInput = { patientId, isJournal: false };
    if (params.sourceType && params.sourceType.length > 0) {
      where.sourceType =
        params.sourceType.length === 1
          ? params.sourceType[0]
          : { in: params.sourceType };
    }
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: INVOICE_INCLUDE,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async updateInvoice(id: string, dto: UpdateInvoiceDto) {
    return this.prisma.$transaction(async (tx) => {
      const ref = await tx.invoice.findUnique({ where: { id }, select: { journalId: true } });
      if (ref?.journalId) await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${ref.journalId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${id} FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.isJournal) throw new BadRequestException('Jurnal hisobini bevosita tahrirlab bo‘lmaydi');
      if (dto.sourceType === InvoiceSourceType.CASE && !invoice.journalId) throw new BadRequestException('Jurnal orqali invois yarating');
      if (invoice.journalId) {
        if (dto.items || dto.patientId || dto.sourceType || dto.sourceId ||
            (dto.status && dto.status !== InvoiceStatus.CANCELLED)) {
          throw new BadRequestException('Jurnaldan yaratilgan invois tarkibini o‘zgartirib bo‘lmaydi');
        }
        if (dto.status === InvoiceStatus.CANCELLED && invoice.paidCash.add(invoice.paidBonus).gt(0)) {
          throw new BadRequestException('To‘lov mavjud invoisni bekor qilib bo‘lmaydi');
        }
      }

      // If status is being updated to CANCELLED, use the cancel logic
      if (dto.status === InvoiceStatus.CANCELLED) {
        if (invoice.status === InvoiceStatus.PAID) {
          throw new BadRequestException('Cannot cancel a paid invoice');
        }
        return tx.invoice.update({
          where: { id },
          data: { status: InvoiceStatus.CANCELLED },
          include: INVOICE_INCLUDE,
        });
      }

      // Otherwise, prevent any changes if it's already PAID or CANCELLED
      if (
        invoice.status === InvoiceStatus.PAID ||
        invoice.status === InvoiceStatus.CANCELLED
      ) {
        throw new BadRequestException('Cannot edit a paid or cancelled invoice');
      }

      const updateData: Prisma.InvoiceUpdateInput = {};

      if (dto.patientId) {
        updateData.patient = { connect: { id: dto.patientId } };
      }
      if (dto.dueDate !== undefined) {
        updateData.dueDate = dto.dueDate;
      }
      if (dto.note !== undefined) {
        updateData.note = dto.note;
      }
      if (dto.sourceType !== undefined) {
        updateData.sourceType = dto.sourceType;
      }
      if (dto.sourceId !== undefined) {
        updateData.sourceId = dto.sourceId;
      }
      if (dto.status !== undefined) {
        updateData.status = dto.status;
      }

      if (dto.items) {
        // Delete all old items
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: id },
        });

        // Calculate new total amount
        const totalAmount = dto.items.reduce((sum, item) => {
          return sum.add(new Prisma.Decimal(item.unitPrice).mul(item.quantity));
        }, new Prisma.Decimal(0));

        updateData.totalAmount = totalAmount;

        // Recreate items
        updateData.items = {
          create: dto.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(item.unitPrice).mul(item.quantity),
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            dateFrom: item.dateFrom,
            dateTo: item.dateTo,
          })),
        };

        // Automatically adjust status based on payments
        if (dto.status === undefined) {
          const totalPaid = invoice.paidCash.add(invoice.paidBonus);
          if (totalPaid.greaterThanOrEqualTo(totalAmount)) {
            updateData.status = InvoiceStatus.PAID;
          } else if (totalPaid.greaterThan(0)) {
            updateData.status = InvoiceStatus.PARTIALLY_PAID;
          } else {
            updateData.status = InvoiceStatus.ISSUED;
          }
        }
      }

      return tx.invoice.update({
        where: { id },
        data: updateData,
        include: INVOICE_INCLUDE,
      });
    });
  }
}
