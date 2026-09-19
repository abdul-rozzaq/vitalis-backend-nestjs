/** Run against a disposable, migrated database: JOURNAL_TEST_DATABASE_URL=... npm run test:journal */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { PrismaService } from '../src/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { InvoiceItemSourceType as Source, InvoiceStatus, PaymentMethod } from '../src/generated/prisma/enums';
import { BalanceService } from '../src/modules/balance/balance.service';
import { CasesService } from '../src/modules/cases/cases.service';
import { CasesRepository } from '../src/modules/cases/cases.repository';
import { RoleName } from '../src/common/enums/role-name.enum';
import { InvoiceService } from '../src/modules/invoice/invoice.service';
import { JournalIssueMode as Mode } from '../src/modules/invoice/dto/issue-journal-invoices.dto';

const testUrl = process.env.JOURNAL_TEST_DATABASE_URL;
test('journal invoices with PostgreSQL', { skip: !testUrl }, async t => {
  const url = new URL(testUrl!);
  assert.match(url.pathname, /test/, 'Use a disposable test database');
  process.env.DATABASE_URL = testUrl;
  const prisma = new PrismaService();
  const service = new InvoiceService(prisma, new BalanceService(prisma));
  const decimal = (value: string | number) => new Prisma.Decimal(value);
  try {
    await prisma.$connect();
    const user = await prisma.user.create({ data: { first_name: 'Journal', last_name: 'Test', phone: randomUUID().slice(0, 20), password: 'unused', role: 'ADMIN' } });
    const patient = await prisma.patient.create({ data: { first_name: 'Journal', last_name: 'Test', gender: 'male', birth_date: new Date('2000-01-01') } });
    const patientCase = await prisma.patientCase.create({ data: { patientId: patient.id, billingMode: 'MASTER' } });
    const append = (value: number, sourceType: Source = Source.LAB_SERVICE) => service.billCaseService(prisma, {
      patientId: patient.id, caseId: patientCase.id, createdById: user.id,
      items: [{ description: 'Test service', quantity: 1, unitPrice: decimal(value), sourceType }],
    });
    const read = async () => (await service.getJournals([patientCase.id]))[0];
    await append(100);
    await append(200, Source.WARD_DAILY);

    await t.test('draft journal is excluded from payable lists and cannot be paid or issued directly', async () => {
      assert.equal((await service.listInvoices({ patientId: patient.id })).length, 0);
      assert.equal((await service.getPatientInvoices(patient.id, { page: 1, limit: 20 })).total, 0);
      const journal = await read();
      assert.equal(journal.totalAmount.toString(), '300');
      await assert.rejects(service.payInvoice({ invoiceId: journal.id, cashAmount: decimal(1), bonusAmount: decimal(0), staffId: user.id }));
      await assert.rejects(service.updateInvoice(journal.id, { status: InvoiceStatus.ISSUED }));
    });

    let amountInvoiceId: string;
    await t.test('amount allocation is exact and repeated requests return the original invoice', async () => {
      const dto = { mode: Mode.AMOUNT, amount: '125.50', requestId: randomUUID() };
      const [invoice] = await service.issueJournalInvoices(patientCase.id, dto, user.id);
      amountInvoiceId = invoice.id;
      assert.equal(invoice.totalAmount.toString(), '125.5');
      assert.equal(invoice.items.reduce((sum, i) => sum.add(i.totalPrice), decimal(0)).toString(), '125.5');
      assert.equal((await service.issueJournalInvoices(patientCase.id, dto, user.id))[0].id, invoice.id);
      assert.equal((await read()).unbilledAmount.toString(), '174.5');
    });

    await t.test('overlapping concurrent requests cannot bill the same remaining services twice', async () => {
      const results = await Promise.allSettled([1, 2].map(() => service.issueJournalInvoices(patientCase.id, { mode: Mode.AMOUNT, amount: '174.50', requestId: randomUUID() }, user.id)));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(results.filter(r => r.status === 'rejected').length, 1);
      assert.equal((await read()).unbilledAmount.toString(), '0');
    });

    await t.test('cancelling an unpaid child makes exactly its allocation available again', async () => {
      await service.cancelInvoice(amountInvoiceId);
      assert.equal((await read()).unbilledAmount.toString(), '125.5');
      await assert.rejects(service.issueJournalInvoices(patientCase.id, { mode: Mode.AMOUNT, amount: '125.51', requestId: randomUUID() }, user.id));
    });

    let payableId: string;
    await t.test('category mode issues separate invoices and appending never modifies them', async () => {
      const invoices = await service.issueJournalInvoices(patientCase.id, { mode: Mode.GROUPS, groups: [Source.LAB_SERVICE, Source.WARD_DAILY], requestId: randomUUID() }, user.id);
      assert.equal(invoices.length, 2);
      assert.equal(invoices.reduce((sum, i) => sum.add(i.totalAmount), decimal(0)).toString(), '125.5');
      payableId = invoices[0].id;
      const snapshot = invoices[0].totalAmount.toString();
      await append(50);
      assert.equal((await service.getInvoice(payableId)).totalAmount.toString(), snapshot);
      assert.equal((await read()).unbilledAmount.toString(), '50');
      await assert.rejects(service.updateInvoice(payableId, { items: [] }));
    });

    await t.test('child payment is counted once; paid allocations cannot be released by cancellation', async () => {
      await service.payInvoice({ invoiceId: payableId, cashAmount: decimal(1), bonusAmount: decimal(0), staffId: user.id, topUp: true, paymentMethod: PaymentMethod.CASH });
      const journal = await read();
      assert.equal(journal.paidCash.toString(), '1');
      assert.equal(journal.unbilledAmount.toString(), '50');
      await assert.rejects(service.cancelInvoice(payableId));
      await assert.rejects(service.payInvoice({ invoiceId: payableId, cashAmount: decimal(10000), bonusAmount: decimal(0), staffId: user.id }));
    });

    await t.test('selection rejects foreign items and bills only the chosen remaining row', async () => {
      await assert.rejects(service.issueJournalInvoices(patientCase.id, { mode: Mode.ITEMS, itemIds: ['missing'], requestId: randomUUID() }, user.id));
      const journal = await read();
      const item = journal.items.find(i => i.remainingAmount.gt(0))!;
      const [invoice] = await service.issueJournalInvoices(patientCase.id, { mode: Mode.ITEMS, itemIds: [item.id], requestId: randomUUID() }, user.id);
      assert.equal(invoice.totalAmount.toString(), '50');
      assert.equal((await read()).unbilledAmount.toString(), '0');
    });

    await t.test('concurrent additions preserve both service totals', async () => {
      await Promise.all([append(10), append(20)]);
      const journal = await read();
      assert.equal(journal.totalAmount.toString(), '380');
      assert.equal(journal.unbilledAmount.toString(), '30');
      assert.equal(journal.items.reduce((sum, item) => sum.add(item.totalPrice), decimal(0)).toString(), '380');
    });

    await t.test('closing the journal preserves balance and leaves unbilled services unissued', async () => {
      const cases = new CasesService(new CasesRepository(prisma), prisma, service);
      const before = await read();
      const balanceBefore = await prisma.patientBalance.findUnique({ where: { patientId: patient.id } });
      await cases.closeCase(patientCase.id, 'COMPLETED', { userId: user.id, role: RoleName.ADMIN });
      const after = await read();
      assert.equal(after.unbilledAmount.toString(), before.unbilledAmount.toString());
      assert.equal(after.issuedInvoices.length, before.issuedInvoices.length);
      assert.equal(after.paidCash.toString(), before.paidCash.toString());
      assert.equal((await prisma.patientBalance.findUnique({ where: { patientId: patient.id } }))?.balance.toString(), balanceBefore?.balance.toString());
      assert.equal((await prisma.patientCase.findUnique({ where: { id: patientCase.id } }))?.status, 'COMPLETED');
    });

    const legacy = await prisma.invoice.findUnique({ where: { id: 'legacy-paid' } });
    await t.test('legacy migration preserves invoice IDs, payments, allocation totals and draft rows', { skip: !legacy }, async () => {
      assert.equal(legacy!.status, 'PAID');
      assert.equal(legacy!.paidCash.toString(), '10');
      assert.equal((await prisma.invoicePayment.findUnique({ where: { id: 'legacy-payment' } }))!.invoiceId, 'legacy-paid');
      const journals = await service.getJournals(['draft-case', 'issued-case', 'partial-case']);
      const draft = journals.find(j => j.sourceId === 'draft-case')!;
      assert.equal(draft.id, 'legacy-draft');
      assert.equal(draft.unbilledAmount.toString(), '300');
      const issued = journals.find(j => j.sourceId === 'issued-case')!;
      assert.equal(issued.totalAmount.toString(), '100');
      assert.equal(issued.unbilledAmount.toString(), '0');
      assert.equal(issued.paidCash.toString(), '10');
      const partial = journals.find(j => j.sourceId === 'partial-case')!;
      assert.equal(partial.paidCash.toString(), '5');
      assert.equal(partial.unbilledAmount.toString(), '0');
    });
  } finally {
    await prisma.$disconnect();
  }
});
