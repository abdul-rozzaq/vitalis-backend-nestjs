import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Prisma } from '../../generated/prisma/client';
import { OperationsService } from './operations.service';

function setup(caseId?: string, failBilling = false) {
  const tx = {};
  const operation = {
    id: 'operation', patientId: 'patient', basePrice: new Prisma.Decimal(350000),
    operationType: { name: 'Operatsiya' },
    items: [{ id: 'extra', name: 'Xizmat', quantity: 2, unitPrice: new Prisma.Decimal(10000) }],
    caseStep: caseId ? { caseId, labOrders: [{ items: [{ service: { id: 'lab', name: 'Tahlil', price: 25000 } }] }] } : null,
  };
  const calls: any[] = [];
  const repo = { create: async (_dto: unknown, callback: any) => {
    await callback(tx, operation);
    return operation;
  } };
  const billing = { billCaseService: async (client: unknown, params: any) => {
    calls.push({ client, ...params });
    if (failBilling) throw new Error('billing failed');
    return null;
  } };
  const service = new OperationsService(repo as any, billing as any, {} as any);
  return { service, calls, tx, operation };
}

it('records operation, extras and labs in the case journal within the creation transaction', async () => {
  const { service, calls, tx, operation } = setup('case');
  assert.equal(await service.create({ patientId: 'patient' }, 'staff'), operation);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].client, tx);
  assert.equal(calls[0].caseId, 'case');
  assert.equal(calls[0].createdById, 'staff');
  assert.deepEqual(calls[0].items.map((item: any) => [item.sourceType, item.sourceId, item.quantity, item.unitPrice.toString()]), [
    ['OPERATION', 'operation', 1, '350000'],
    ['OPERATION', 'extra', 2, '10000'],
    ['LAB_SERVICE', 'lab', 1, '25000'],
  ]);
});

it('keeps standalone operations out of journals', async () => {
  const { service, calls } = setup();
  await service.create({ patientId: 'patient' }, 'staff');
  assert.equal(calls.length, 0);
});

it('propagates journal failures so operation creation cannot commit without billing', async () => {
  const { service } = setup('case', true);
  await assert.rejects(service.create({ patientId: 'patient' }, 'staff'), /billing failed/);
});

function setupExisting(overrides: Record<string, unknown> = {}) {
  const operation = {
    id: 'operation', patientId: 'patient', status: 'SCHEDULED',
    operationTypeId: 'type', departmentId: 'department', contractNumber: '123',
    roomId: 'room', scheduledAt: new Date(), surgeons: [{ role: 'LEAD' }],
    ...overrides,
  };
  const transitions: unknown[] = [];
  const service = new OperationsService({
    findOne: async () => operation,
    updateStatus: async (...args: unknown[]) => { transitions.push(args); return operation; },
  } as any, {} as any, {
    patientCase: { findUnique: async () => ({ billingMode: 'MASTER' }) },
  } as any);
  return { service, transitions };
}

for (const [field, value, label] of [
  ['operationTypeId', null, 'operatsiya turi'],
  ['departmentId', null, 'bo‘lim'],
  ['contractNumber', '   ', 'shartnoma raqami'],
  ['roomId', null, 'xona'],
  ['scheduledAt', null, 'sana va vaqt'],
  ['surgeons', [{ role: 'ASSISTANT' }], 'bosh jarroh'],
] as const) {
  it(`refuses to start without ${field}`, async () => {
    const { service, transitions } = setupExisting({ [field]: value });
    await assert.rejects(service.start('operation'), new RegExp(label));
    assert.equal(transitions.length, 0);
  });
}

it('starts a prepared operation', async () => {
  const { service, transitions } = setupExisting();
  await service.start('operation');
  assert.equal(transitions.length, 1);
  assert.equal((transitions[0] as any[])[1], 'IN_PROGRESS');
});

it('cannot bypass start validation with a generic status update', async () => {
  const { service } = setupExisting({ roomId: null });
  await assert.rejects(service.update('operation', { status: 'IN_PROGRESS' }), /tegishli boshlash/);
});

it('does not create a second bill for an operation owned by a journal', async () => {
  const { service } = setupExisting({ caseStep: { caseId: 'case' } });
  for (const amount of [undefined, 100000]) {
    await assert.rejects(service.createInvoiceForOperation('operation', 'staff', amount), /jurnalidan/);
  }
});


it('allows starting without optional notes, assistants, extras and labs', async () => {
  const { service, transitions } = setupExisting({ note: null, items: [], caseStep: null });
  await service.start('operation');
  assert.equal(transitions.length, 1);
});

it('reports all missing preparation fields together', async () => {
  const { service } = setupExisting({
    operationTypeId: null, departmentId: null, contractNumber: null,
    roomId: null, scheduledAt: null, surgeons: [],
  });
  await assert.rejects(service.start('operation'), (error: Error) => {
    for (const label of ['operatsiya turi', 'bo‘lim', 'shartnoma raqami', 'xona', 'sana va vaqt', 'bosh jarroh']) {
      assert.ok(error.message.includes(label));
    }
    return true;
  });
});
