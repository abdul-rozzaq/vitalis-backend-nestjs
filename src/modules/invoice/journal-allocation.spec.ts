import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '../../generated/prisma/client';
import { InvoiceItemSourceType as Source } from '../../generated/prisma/enums';
import { allocateJournal, JournalAvailableItem } from './journal-allocation';
import { IssueJournalInvoicesDto, JournalIssueMode as Mode } from './dto/issue-journal-invoices.dto';

const item = (id: string, amount: string, sourceType: Source = Source.LAB_SERVICE): JournalAvailableItem => ({ id, remainingAmount: new Prisma.Decimal(amount), sourceType });
const issue = (args: Omit<IssueJournalInvoicesDto, 'requestId'>) => ({ ...args, requestId: 'test' });
const amounts = (result: ReturnType<typeof allocateJournal>) => result.map(rows => rows.map(row => [row.itemId, row.amount.toString()]));

describe('journal invoice allocation', () => {
  it('creates a separate invoice for each selected category, excluding exhausted items', () => {
    const result = allocateJournal([item('lab', '120'), item('old', '0'), item('ward', '300', Source.WARD_DAILY)], issue({ mode: Mode.GROUPS, groups: [Source.WARD_DAILY, Source.LAB_SERVICE] }));
    assert.deepEqual(amounts(result), [[['ward', '300']], [['lab', '120']]]);
  });
  it('combines selected services into one invoice using only their unbilled remainder', () => {
    assert.deepEqual(amounts(allocateJournal([item('a', '25'), item('b', '50'), item('c', '80')], issue({ mode: Mode.ITEMS, itemIds: ['a', 'c'] }))), [[['a', '25'], ['c', '80']]]);
  });
  it('allocates a fixed amount across oldest services with exact fractional currency', () => {
    assert.deepEqual(amounts(allocateJournal([item('a', '0.10'), item('b', '0.20')], issue({ mode: Mode.AMOUNT, amount: '0.29' }))), [[['a', '0.1'], ['b', '0.19']]]);
  });
  it('supports an amount smaller than a single service and the exact remaining total', () => {
    assert.deepEqual(amounts(allocateJournal([item('a', '100')], issue({ mode: Mode.AMOUNT, amount: '30' }))), [[['a', '30']]]);
    assert.deepEqual(amounts(allocateJournal([item('a', '100')], issue({ mode: Mode.AMOUNT, amount: '100' }))), [[['a', '100']]]);
  });
  it('rejects overbilling, zero, negative, excessive precision and non-finite amounts', () => {
    for (const amount of ['100.01', '0', '-1', 'NaN', 'Infinity', '0.001', '1e2']) {
      assert.throws(() => allocateJournal([item('a', '100')], issue({ mode: Mode.AMOUNT, amount })));
    }
  });
  it('rejects missing, duplicate, or previously billed selections', () => {
    for (const itemIds of [[], ['missing'], ['a', 'a'], ['exhausted']]) {
      assert.throws(() => allocateJournal([item('a', '100'), item('exhausted', '0')], issue({ mode: Mode.ITEMS, itemIds })));
    }
    assert.throws(() => allocateJournal([item('a', '100')], issue({ mode: Mode.GROUPS, groups: [Source.WARD_DAILY] })));
  });
  it('rejects contradictory modes and attempts to bill an empty journal', () => {
    assert.throws(() => allocateJournal([item('a', '100')], issue({ mode: Mode.AMOUNT, amount: '10', itemIds: ['a'] })));
    assert.throws(() => allocateJournal([], issue({ mode: Mode.AMOUNT, amount: '10' })));
  });
});
