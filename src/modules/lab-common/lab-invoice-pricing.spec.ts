import { strict as assert } from "node:assert";
import test from "node:test";
import { Prisma } from "../../generated/prisma/client";
import { combineLabInvoiceItems } from "./lab-invoice-pricing";

const item = (price: number) => ({
  name: `service-${price}`,
  description: `Tahlil ${price}`,
  quantity: 1,
  unitPrice: new Prisma.Decimal(price),
  totalPrice: new Prisma.Decimal(price),
  sourceType: "LAB_SERVICE",
  sourceId: `service-${price}`,
});

test("combines one lab referral into one journal row with its service breakdown", () => {
  const result = combineLabInvoiceItems([item(0), item(0), item(0)], new Prisma.Decimal(50_000));
  assert.equal(result.length, 1);
  assert.equal(result[0].description, "Laboratoriya tahlillari: Tahlil 0, Tahlil 0, Tahlil 0");
  assert.equal(result[0].totalPrice.toNumber(), 50_000);
});

test("keeps the first service source link on the combined row", () => {
  const result = combineLabInvoiceItems([item(10_000), item(20_000)], new Prisma.Decimal(30_000));
  assert.equal(result[0].sourceId, "service-10000");
});
