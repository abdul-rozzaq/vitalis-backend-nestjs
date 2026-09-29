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
