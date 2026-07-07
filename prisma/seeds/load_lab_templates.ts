import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { UMUMIY_QON_TAHLILI_ROWS, BIOKIMYOVIY_TAHLIL_ROWS, DefaultRowSeed } from "./data/lab-default-rows";

const connectionString = process.env.DATABASE_URL;

interface LabServiceSeed {
  name: string;
  price?: number;
  defaultRows: DefaultRowSeed[];
}

interface LaboratorySeed {
  name: string;
  description?: string;
  services: LabServiceSeed[];
}

export const LAB_TEMPLATES: LaboratorySeed[] = [
  {
    name: "Klinik laboratoriya",
    description: "Qon va siydik tahlillari",
    services: [
      { name: "Umumiy qon tahlili", price: 25000, defaultRows: UMUMIY_QON_TAHLILI_ROWS },
      { name: "Biokimyoviy qon tahlili", price: 45000, defaultRows: BIOKIMYOVIY_TAHLIL_ROWS },
    ],
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("🔬 Laboratoriya natija shablonlari yuklanmoqda...");

    for (const lab of LAB_TEMPLATES) {
      let labRec = await prisma.laboratory.findFirst({ where: { name: lab.name } });
      if (!labRec) {
        labRec = await prisma.laboratory.create({
          data: { name: lab.name, description: lab.description },
        });
        console.log(`   + Laboratoriya yaratildi: ${labRec.name}`);
      }

      for (const svc of lab.services) {
        const rows = svc.defaultRows.map((r, i) => ({ ...r, sortOrder: i }));

        const svcRec = await prisma.laboratoryService.findFirst({
          where: { name: svc.name, laboratoryId: labRec.id },
        });

        if (svcRec) {
          await prisma.laboratoryService.update({
            where: { id: svcRec.id },
            data: { defaultRows: rows },
          });
          console.log(`   ✓ Shablon yangilandi: ${lab.name} → ${svc.name} (${rows.length} qator)`);
        } else {
          await prisma.laboratoryService.create({
            data: {
              name: svc.name,
              price: svc.price,
              laboratoryId: labRec.id,
              defaultRows: rows,
            },
          });
          console.log(`   + Xizmat va shablon yaratildi: ${lab.name} → ${svc.name} (${rows.length} qator)`);
        }
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