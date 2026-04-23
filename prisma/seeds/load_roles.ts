// @ts-nocheck

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

const SYSTEM_ROLES = [
  { name: "ADMIN", description: "Full system access" },
  { name: "DOCTOR", description: "Medical staff — scoped to own patients" },
  { name: "NURSE", description: "Nursing staff" },
  { name: "RECEPTIONIST", description: "Front desk staff" },
];

type RoleName = "ADMIN" | "DOCTOR" | "NURSE" | "RECEPTIONIST";

const PERMISSIONS: { method: string; path: string; roles: RoleName[] }[] = [
  // Patients
  { method: "GET",    path: "/api/patients",           roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "GET",    path: "/api/patients/:id",        roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "GET",    path: "/api/patients/:id/timeline", roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "POST",   path: "/api/patients",           roles: ["ADMIN", "RECEPTIONIST"] },
  { method: "PATCH",  path: "/api/patients/:id",        roles: ["ADMIN", "RECEPTIONIST"] },
  { method: "DELETE", path: "/api/patients/:id",        roles: ["ADMIN"] },

  // Appointments
  { method: "GET",    path: "/api/appointments",        roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "GET",    path: "/api/appointments/:id",    roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "POST",   path: "/api/appointments",        roles: ["ADMIN", "RECEPTIONIST"] },
  { method: "PATCH",  path: "/api/appointments/:id",    roles: ["ADMIN", "RECEPTIONIST"] },
  { method: "DELETE", path: "/api/appointments/:id",    roles: ["ADMIN"] },
  { method: "POST",   path: "/api/appointments/:id/files", roles: ["ADMIN", "DOCTOR"] },

  // Prescriptions
  { method: "GET",    path: "/api/prescriptions",       roles: ["ADMIN", "DOCTOR", "NURSE"] },
  { method: "GET",    path: "/api/prescriptions/:id/print", roles: ["ADMIN", "DOCTOR"] },
  { method: "POST",   path: "/api/prescriptions",       roles: ["ADMIN", "DOCTOR"] },
  { method: "DELETE", path: "/api/prescriptions/:id",   roles: ["ADMIN", "DOCTOR"] },

  // Payments
  { method: "GET",    path: "/api/payments",            roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "GET",    path: "/api/payments/:id",        roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "POST",   path: "/api/payments",            roles: ["ADMIN", "RECEPTIONIST"] },
  { method: "PATCH",  path: "/api/payments/:id",        roles: ["ADMIN", "RECEPTIONIST"] },
  { method: "DELETE", path: "/api/payments/:id",        roles: ["ADMIN"] },

  // Departments
  { method: "GET",    path: "/api/departments",         roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "GET",    path: "/api/departments/:id",     roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "POST",   path: "/api/departments",         roles: ["ADMIN"] },
  { method: "PATCH",  path: "/api/departments/:id",     roles: ["ADMIN"] },
  { method: "DELETE", path: "/api/departments/:id",     roles: ["ADMIN"] },

  // Assignments
  { method: "GET",    path: "/api/assignments",         roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "GET",    path: "/api/assignments/:id",     roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "POST",   path: "/api/assignments",         roles: ["ADMIN"] },
  { method: "PATCH",  path: "/api/assignments/:id",     roles: ["ADMIN"] },
  { method: "DELETE", path: "/api/assignments/:id",     roles: ["ADMIN"] },

  // Users
  { method: "GET",    path: "/api/users",               roles: ["ADMIN"] },
  { method: "GET",    path: "/api/users/:id",           roles: ["ADMIN"] },
  { method: "POST",   path: "/api/users",               roles: ["ADMIN"] },
  { method: "PUT",    path: "/api/users/:id",           roles: ["ADMIN"] },
  { method: "DELETE", path: "/api/users/:id",           roles: ["ADMIN"] },

  // Roles & Permissions
  { method: "GET",    path: "/api/roles",               roles: ["ADMIN"] },
  { method: "GET",    path: "/api/permissions",         roles: ["ADMIN"] },
  { method: "POST",   path: "/api/permissions",         roles: ["ADMIN"] },

  // Medical Cards
  { method: "GET",    path: "/api/medical-cards/003x/:id",         roles: ["ADMIN", "DOCTOR", "NURSE"] },
  { method: "POST",   path: "/api/medical-cards/003x",             roles: ["ADMIN", "DOCTOR"] },
  { method: "PATCH",  path: "/api/medical-cards/003x/:id",         roles: ["ADMIN", "DOCTOR"] },
  { method: "GET",    path: "/api/patients/:id/medical-cards",     roles: ["ADMIN", "DOCTOR", "NURSE"] },

  // Medicines
  { method: "GET",    path: "/api/medicines",           roles: ["ADMIN", "DOCTOR", "NURSE"] },
  { method: "POST",   path: "/api/medicines/upsert",   roles: ["ADMIN", "DOCTOR"] },

  // Uploads
  { method: "POST",   path: "/api/uploads/photo",       roles: ["ADMIN", "DOCTOR", "RECEPTIONIST"] },
  { method: "POST",   path: "/api/uploads/file",        roles: ["ADMIN", "DOCTOR"] },

  // Cases
  { method: "POST",   path: "/api/cases",                     roles: ["ADMIN", "RECEPTIONIST"] },
  { method: "GET",    path: "/api/cases/:id",                 roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
  { method: "POST",   path: "/api/cases/:id/steps",           roles: ["ADMIN", "DOCTOR", "RECEPTIONIST"] },
  { method: "PATCH",  path: "/api/cases/:id/steps/:id",       roles: ["ADMIN", "DOCTOR"] },
  { method: "PATCH",  path: "/api/cases/:id/close",           roles: ["ADMIN", "DOCTOR"] },
  { method: "GET",    path: "/api/patients/:id/cases",        roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
];

async function main() {
  console.log("Seeding system roles and permissions...");

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  // Upsert system roles
  const roleMap = new Map<RoleName, string>();

  for (const role of SYSTEM_ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      create: { name: role.name, description: role.description, isSystem: true },
      update: { description: role.description, isSystem: true },
    });
    roleMap.set(role.name as RoleName, created.id);
    console.log(`  Role: ${role.name} → ${created.id}`);
  }

  // Upsert permissions
  let count = 0;
  for (const perm of PERMISSIONS) {
    for (const roleName of perm.roles) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;

      await prisma.permission.upsert({
        where: { roleId_method_path: { roleId, method: perm.method, path: perm.path } },
        create: { roleId, method: perm.method, path: perm.path },
        update: {},
      });
      count++;
    }
  }

  console.log(`  Seeded ${count} permissions across ${SYSTEM_ROLES.length} roles.`);
  console.log("Done.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
