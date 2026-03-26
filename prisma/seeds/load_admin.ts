// @ts-nocheck

import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import "dotenv/config";

console.log(bcrypt.hash)

const DEFAULT_ROLES = [
  { name: "USER", description: "Oddiy foydalanuvchi" },
  { name: "NURSE", description: "Hamshira" },
  { name: "DOCTOR", description: "Shifokor" },
  { name: "DIRECTOR", description: "Direktor" },
  { name: "ADMIN", description: "Administrator" },
];

async function main() {
  const [adminEmail, adminPassword] = process.argv.slice(2);

  if (!adminEmail || !adminPassword) {
    console.error("Iltimos, admin email va parolini kiriting");
    console.error("Misol: npm run load-admin admin@example.com password123");
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
    // 1. Default rollarni yaratish (agar mavjud bo'lmasa)
    console.log("Rollar tekshirilmoqda...");
    for (const role of DEFAULT_ROLES) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      });
    }
    console.log("✅ Rollar tayyor");

    // 2. Admin userini yaratish / yangilash
    console.log("Admin user yaratilmoqda...");

    const adminRole = await prisma.role.findUniqueOrThrow({
      where: { name: "ADMIN" },
    });

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { password: hashedPassword, roleId: adminRole.id, isSuperUser: true },
      create: {
        first_name: "Admin",
        last_name: "Admin",
        email: adminEmail,
        password: hashedPassword,
        isSuperUser: true,
        role: { connect: { id: adminRole.id } },
      },
      include: { role: true },
    });

    console.log("✅ Admin user tayyor:");
    console.log(`   Email : ${admin.email}`);
    console.log(`   Role  : ${admin.role.name}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Seed xatosi:", e);
  process.exit(1);
});
