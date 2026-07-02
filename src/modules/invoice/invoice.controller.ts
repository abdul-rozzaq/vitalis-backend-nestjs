import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { Prisma } from '../../generated/prisma/client';
import { InvoiceItemSourceType, InvoiceSourceType, InvoiceStatus } from '../../generated/prisma/enums';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { InvoiceService } from './invoice.service';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  listInvoices(
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sourceType') sourceType?: string,
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('patientSearch') patientSearch?: string,
    @Query('amountMin') amountMin?: string,
    @Query('amountMax') amountMax?: string,
  ) {
    return this.invoiceService.listInvoices({
      status: status as InvoiceStatus | undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      sourceType: sourceType
        ? (sourceType
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean) as InvoiceSourceType[])
        : undefined,
      patientId,
      doctorId,
      patientSearch,
      amountMin: amountMin ? parseFloat(amountMin) : undefined,
      amountMax: amountMax ? parseFloat(amountMax) : undefined,
    });
  }

  @Get('payments')
  listPayments(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('patientId') patientId?: string,
    @Query('patientSearch') patientSearch?: string,
    @Query('amountMin') amountMin?: string,
    @Query('amountMax') amountMax?: string,
    @Query('invoiceSourceType') invoiceSourceType?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    return this.invoiceService.listPayments({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      patientId,
      patientSearch,
      amountMin: amountMin ? parseFloat(amountMin) : undefined,
      amountMax: amountMax ? parseFloat(amountMax) : undefined,
      invoiceSourceType: invoiceSourceType
        ? (invoiceSourceType
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean) as any[])
        : undefined,
      paymentMethod: paymentMethod
        ? (paymentMethod
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean) as any[])
        : undefined,
    });
  }

  @Patch('payments/:id/method')
  updatePaymentMethod(
    @Param('id') paymentId: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.invoiceService.updatePaymentMethod(paymentId, dto.paymentMethod);
  }

  @Post()
  createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: JwtPayload) {
    return this.invoiceService.createInvoice({
      patientId: dto.patientId,
      sourceType: dto.sourceType as InvoiceSourceType,
      sourceId: dto.sourceId,
      items: dto.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        sourceType: item.sourceType as InvoiceItemSourceType,
        sourceId: item.sourceId,
        dateFrom: item.dateFrom,
        dateTo: item.dateTo,
      })),
      dueDate: dto.dueDate,
      note: dto.note,
      staffId: user.userId,
    });
  }

  @Get(':id')
  getInvoice(@Param('id') id: string) {
    return this.invoiceService.getInvoice(id);
  }

  @Post(':id/pay')
  payInvoice(
    @Param('id') invoiceId: string,
    @Body() dto: PayInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoiceService.payInvoice({
      invoiceId,
      cashAmount: new Prisma.Decimal(dto.cashAmount),
      bonusAmount: new Prisma.Decimal(dto.bonusAmount),
      staffId: user.userId,
      note: dto.note,
    });
  }

  @Patch(':id')
  cancelInvoice(@Param('id') id: string) {
    return this.invoiceService.cancelInvoice(id);
  }
}

@Controller('patients/:patientId/invoices')
export class PatientInvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  getPatientInvoices(
    @Param('patientId') patientId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('sourceType') sourceType?: string,
  ) {
    return this.invoiceService.getPatientInvoices(patientId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sourceType: sourceType
        ? (sourceType
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean) as InvoiceSourceType[])
        : undefined,
    });
  }
}