import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { InvoiceItemSourceType } from '../../generated/prisma/enums';
import { IssueJournalInvoicesDto, JournalIssueMode } from './dto/issue-journal-invoices.dto';

export interface JournalAvailableItem {
  id: string;
  sourceType: InvoiceItemSourceType;
  remainingAmount: Prisma.Decimal;
}

export interface JournalAllocation {
  itemId: string;
  amount: Prisma.Decimal;
}

/** Allocate oldest services first for a fixed amount, without rounding money through JS numbers. */
export function allocateJournal(items: JournalAvailableItem[], dto: IssueJournalInvoicesDto): JournalAllocation[][] {
  const available = items.filter(i => i.remainingAmount.gt(0));
  const allocate = (rows: JournalAvailableItem[]) => rows.map(i => ({ itemId: i.id, amount: i.remainingAmount }));
  if (dto.mode === JournalIssueMode.GROUPS) {
    if (!dto.groups?.length || dto.itemIds || dto.amount !== undefined) throw new BadRequestException("Bo'limlarni tanlang");
    const result = dto.groups.map(group => allocate(available.filter(i => i.sourceType === group)));
    if (result.some(rows => !rows.length)) throw new BadRequestException("Tanlangan bo'limda invoisga chiqarilmagan xizmat yo'q");
    return result;
  }
  if (dto.mode === JournalIssueMode.ITEMS) {
    if (!dto.itemIds?.length || dto.groups || dto.amount !== undefined) throw new BadRequestException('Xizmatlarni tanlang');
    const selected = available.filter(i => dto.itemIds.includes(i.id));
    if (selected.length !== dto.itemIds.length) throw new BadRequestException('Xizmat topilmadi yoki allaqachon invoisga chiqarilgan');
    return [allocate(selected)];
  }
  if (dto.mode !== JournalIssueMode.AMOUNT || !dto.amount || !/^\d{1,13}(\.\d{1,2})?$/.test(dto.amount) || dto.groups || dto.itemIds) {
    throw new BadRequestException("To'g'ri summani kiriting");
  }
  let remaining = new Prisma.Decimal(dto.amount);
  const total = available.reduce((sum, i) => sum.add(i.remainingAmount), new Prisma.Decimal(0));
  if (remaining.lte(0) || remaining.gt(total)) throw new BadRequestException('Summa jurnalning invoisga chiqarilmagan qismidan oshmasligi kerak');
  const rows: JournalAllocation[] = [];
  for (const item of available) {
    if (remaining.isZero()) break;
    const amount = Prisma.Decimal.min(remaining, item.remainingAmount);
    rows.push({ itemId: item.id, amount });
    remaining = remaining.sub(amount);
  }
  return [rows];
}
