// @ts-nocheck

import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";

async function main() {
  const [adminPhone, adminPassword] = process.argv.slice(2);

  if (!adminPhone || !adminPassword) {
    console.error("Iltimos, admin telefon raqami va parolini kiriting");
    console.error("Misol: npm run load-admin +998901234567 password123");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL aniqlanmagan");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Admin user yaratilmoqda...");

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.upsert({
      where: { phone: adminPhone },
      update: { password: hashedPassword, role: "ADMIN" },
      create: {
        first_name: "Admin",
        last_name: "Admin",
        phone: adminPhone,
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("✅ Admin user tayyor:");
    console.log(`   Phone : ${admin.phone}`);
    console.log(`   Role  : ${admin.role}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Seed xatosi:", e);
  process.exit(1);
});