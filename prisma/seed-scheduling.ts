import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

// Setup adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding StaffRoles...');

  const roles = [
    { code: 'DOCTOR', name: 'Shifokor', description: 'Bosh shifokor yoki tor mutaxassis' },
    { code: 'NURSE', name: 'Hamshira', description: 'Hamshira yoki stajyor' },
    { code: 'FELDSHER', name: 'Feldsher', description: 'Kichik tibbiyot xodimi' },
  ];

  for (const role of roles) {
    await prisma.staffRole.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
