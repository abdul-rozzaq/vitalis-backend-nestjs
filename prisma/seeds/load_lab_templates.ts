import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../../src/generated/prisma/client";
import { UMUMIY_QON_TAHLILI_ROWS, BIOKIMYOVIY_TAHLIL_ROWS, KOAGULOGRAMMA_ROWS, DefaultRowSeed } from "./data/lab-default-rows";
import { BIOCHEMISTRY_RESULT_LAYOUT, CBC_RESULT_LAYOUT } from "../../src/modules/lab-common/result-layout";

const connectionString = process.env.DATABASE_URL;

interface LabResultTemplateSeed {
  name: string;
  rows: DefaultRowSeed[];
  layout: unknown;
}

export const LAB_RESULT_TEMPLATES: LabResultTemplateSeed[] = [
  { name: "Umumiy qon tahlili", rows: UMUMIY_QON_TAHLILI_ROWS, layout: CBC_RESULT_LAYOUT },
  { name: "Biokimyoviy qon tahlili", rows: BIOKIMYOVIY_TAHLIL_ROWS, layout: BIOCHEMISTRY_RESULT_LAYOUT },
  { name: "Koagulogramma tahlili", rows: KOAGULOGRAMMA_ROWS, layout: CBC_RESULT_LAYOUT },
];

async function main() {
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("🔬 Natija shablonlari yuklanmoqda...");

    for (const tpl of LAB_RESULT_TEMPLATES) {
      const rows = tpl.rows.map((r, i) => ({ ...r, sortOrder: i }));

      const existing = await prisma.labResultTemplate.findFirst({ where: { name: tpl.name } });

      if (existing) {
        await prisma.labResultTemplate.update({
          where: { id: existing.id },
          data: { rows: rows as unknown as Prisma.InputJsonValue },
        });
        console.log(`   ✓ Shablon yangilandi: ${tpl.name} (${rows.length} qator)`);
      } else {
        await prisma.labResultTemplate.create({
          data: { name: tpl.name, rows: { layout: tpl.layout, rows } as unknown as Prisma.InputJsonValue },
        });
        console.log(`   + Shablon yaratildi: ${tpl.name} (${rows.length} qator)`);
      }
    }

    console.log("✅ Tayyor.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Seed xatosi:", e);
  process.exit(1);
});