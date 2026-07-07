import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  BalanceTxSource,
  BalanceTxType,
  InvoiceItemSourceType,
  InvoiceSourceType,
  InvoiceStatus,
  PaymentMethod,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { BalanceService } from '../balance/balance.service';

const INVOICE_INCLUDE = {
  items: true,
  payments: true,
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
    patientSearch?: string;
    amountMin?: number;
    amountMax?: number;
  }) {
    const where: Prisma.InvoiceWhereInput = {};
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
    if (params.doctorId) {
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
    return this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: INVOICE_INCLUDE,
    });
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
  }) {
    const where: Prisma.InvoicePaymentWhereInput = {};

    if (params.patientId || params.patientSearch || (params.invoiceSourceType && params.invoiceSourceType.length > 0)) {
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

  async payInvoice(params: {
    invoiceId: string;
    cashAmount: Prisma.Decimal;
    bonusAmount: Prisma.Decimal;
    staffId: string;
    note?: string;
    paymentMethod?: PaymentMethod;
    topUp?: boolean;
  }) {
    return this.prisma.$transaction(async (tx) => {
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

      const totalPayment = params.cashAmount.add(params.bonusAmount);

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

      return tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidCash: newPaidCash,
          paidBonus: newPaidBonus,
          status: newStatus,
        },
        include: INVOICE_INCLUDE,
      });
    });
  }

  async getInvoice(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
  }

  async cancelInvoice(id: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid invoice');
    }
    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
      include: INVOICE_INCLUDE,
    });
  }

  async getPatientInvoices(
    patientId: string,
    params: { page: number; limit: number; sourceType?: InvoiceSourceType[] },
  ) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.InvoiceWhereInput = { patientId };
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
}