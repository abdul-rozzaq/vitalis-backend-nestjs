import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';
import { IssueJournalInvoicesDto } from './issue-journal-invoices.dto';

export class PayJournalDto extends IssueJournalInvoicesDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;
}
