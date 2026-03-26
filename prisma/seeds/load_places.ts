// @ts-nocheck

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import places from "../fixtures/places.json";

const connectionString = process.env.DATABASE_URL;

async function main() {
  console.log("Hududlarni yuklash boshlandi...");

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  for (const place of places) {
    const region = await prisma.region.upsert({
      where: { name: place.name },
      update: {},
      create: { name: place.name },
    });

    for (const districtName of place.districts) {
      await prisma.district.upsert({
        where: { name_regionId: { name: districtName, regionId: region.id } },
        update: {},
        create: { name: districtName, regionId: region.id },
      });
    }

    console.log(`  ✓ ${region.name} (${place.districts.length} ta tuman)`);
  }

  console.log("Hududlar muvaffaqiyatli yuklandi!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
