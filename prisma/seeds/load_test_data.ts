// @ts-nocheck
/**
 * load_test_data.ts — Barcha jadvallar uchun test ma'lumotlari
 *
 * Ishlatish:
 *   ts-node -r tsconfig-paths/register prisma/seeds/load_test_data.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { UMUMIY_QON_TAHLILI_ROWS, BIOKIMYOVIY_TAHLIL_ROWS, KOAGULOGRAMMA_ROWS } from "./data/lab-default-rows";

const connectionString = process.env.DATABASE_URL!;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursFromNow(h: number) {
  const d = new Date();
  d.setHours(d.getHours() + h);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Static data ──────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { name: "Kardiologiya", description: "Yurak va qon tomir kasalliklari", price: 80000 },
  { name: "Nevrologiya", description: "Asab tizimi kasalliklari", price: 75000 },
  { name: "Stomatologiya", description: "Tish davolash markazi", price: 60000 },
  { name: "Pediatriya", description: "Bolalar bo'limi", price: 55000 },
  { name: "Xirurgiya", description: "Umumiy jarrohlik", price: 120000 },
  { name: "Ginekologiya", description: "Ayollar salomatligi", price: 70000 },
  { name: "Oftalmologiya", description: "Ko'z kasalliklari", price: 65000 },
  { name: "LOR", description: "Quloq, burun, tomoq", price: 60000 },
  { name: "Urologiya", description: "Peshob yo'llari kasalliklari", price: 75000 },
  { name: "Terapevt", description: "Umumiy ko'rik bo'limi", price: 50000 },
];

const ROOMS = [
  { name: "101-xona", roomType: "EXAMINATION", capacity: 1 },
  { name: "102-xona", roomType: "EXAMINATION", capacity: 1 },
  { name: "103-xona", roomType: "EXAMINATION", capacity: 1 },
  { name: "104-xona", roomType: "EXAMINATION", capacity: 1 },
  { name: "105-xona", roomType: "EXAMINATION", capacity: 1 },
  { name: "201-xona", roomType: "WARD", capacity: 4 },
  { name: "202-xona", roomType: "WARD", capacity: 4 },
  { name: "203-xona", roomType: "WARD", capacity: 6 },
  { name: "204-xona", roomType: "WARD", capacity: 6 },
  { name: "205-xona", roomType: "WARD", capacity: 8 },
  { name: "Operatsion-1", roomType: "OPERATION", capacity: 1 },
  { name: "Operatsion-2", roomType: "OPERATION", capacity: 1 },
];

const USERS = [
  { first_name: "Akbar",   last_name: "Toshmatov",    phone: "+998901110001", role: "DOCTOR",       birthday: "1985-03-12" },
  { first_name: "Zulfiya", last_name: "Rahimova",      phone: "+998901110002", role: "DOCTOR",       birthday: "1990-07-25" },
  { first_name: "Sardor",  last_name: "Mirzayev",      phone: "+998901110003", role: "DOCTOR",       birthday: "1988-11-08" },
  { first_name: "Nilufar", last_name: "Karimova",      phone: "+998901110004", role: "HAMSHIRA",     birthday: "1995-02-14" },
  { first_name: "Barno",   last_name: "Yusupova",      phone: "+998901110005", role: "HAMSHIRA",     birthday: "1997-06-30" },
  { first_name: "Jasur",   last_name: "Xolmatov",      phone: "+998901110006", role: "KASSIR",       birthday: "1992-09-18" },
  { first_name: "Malika",  last_name: "Ergasheva",     phone: "+998901110007", role: "LABARANT",     birthday: "1993-04-05" },
  { first_name: "Bobur",   last_name: "Normatov",      phone: "+998901110008", role: "DIREKTOR",     birthday: "1975-01-22" },
  { first_name: "Umida",   last_name: "Sotvoldiyeva",  phone: "+998901110009", role: "HISOBCHI",     birthday: "1988-08-16" },
  { first_name: "Sherzod", last_name: "Qodirov",       phone: "+998901110010", role: "TEXNIK_HODIM", birthday: "1999-12-03" },
  { first_name: "Doniyor", last_name: "Xasanov",       phone: "+998901110011", role: "DIAGNOST",     birthday: "1991-05-17" },
];

const LABORATORIES = [
  {
    name: "Klinik laboratoriya",
    description: "Qon va siydik tahlillari",
    services: [
      { name: "Umumiy qon tahlili",      price: 25000, defaultRows: UMUMIY_QON_TAHLILI_ROWS },
      { name: "Biokimyoviy qon tahlili", price: 45000, defaultRows: BIOKIMYOVIY_TAHLIL_ROWS },
      { name: "Koagulogramma tahlili",   price: 40000, defaultRows: KOAGULOGRAMMA_ROWS },
      { name: "Qon guruhi aniqlash",     price: 20000 },
      { name: "Glyukoza darajasi",       price: 18000 },
      { name: "Umumiy siydik tahlili",   price: 15000 },
    ],
  },
  {
    name: "Mikrobiologiya laboratoriyasi",
    description: "Bakteriologik tekshiruvlar",
    services: [
      { name: "Bakteriologik ekim", price: 55000 },
      { name: "Antibiotikogramma",  price: 65000 },
      { name: "PCR tekshiruvi",     price: 80000 },
    ],
  },
  {
    name: "Immunologiya markazi",
    description: "Immunologik va allergologik tekshiruvlar",
    services: [
      { name: "Immunoglobulinlar E",  price: 70000  },
      { name: "Allergen paneli",      price: 120000 },
      { name: "Koronavirus IgG/IgM", price: 85000  },
    ],
  },
];

const DIAGNOSTICS = [
  {
    name: "Ultratovush diagnostikasi (UZI)",
    description: "Ichki organlarni ultratovush tekshiruvi",
    services: [
      { name: "Qorin bo'shlig'i UZI",      price: 60000 },
      { name: "Buyrak va siydik yo'llari UZI", price: 55000 },
      { name: "Qalqonsimon bez UZI",        price: 50000 },
      { name: "Yurak ExoKG",               price: 90000 },
    ],
  },
  {
    name: "Rentgenologiya markazi",
    description: "Rentgen va fluorografiya tekshiruvlari",
    services: [
      { name: "Ko'krak qafasi rentgeni",   price: 35000 },
      { name: "Umurtqa pog'onasi rentgeni", price: 45000 },
      { name: "Qo'l-oyoq suyaklari rentgeni", price: 40000 },
      { name: "Fluorografiya",             price: 25000 },
    ],
  },
  {
    name: "MRT va KT markazi",
    description: "Magnit-rezonans va kompyuter tomografiya",
    services: [
      { name: "Bosh miya MRT",             price: 350000 },
      { name: "Umurtqa pog'onasi MRT",     price: 380000 },
      { name: "Ko'krak qafasi KT",         price: 280000 },
      { name: "Qorin bo'shlig'i KT",       price: 300000 },
    ],
  },
];

// Operatsiya turlari
const OPERATION_TYPES = [
  {
    name: "Appendektomiya",
    description: "O'simta olib tashlash operatsiyasi",
    items: [
      { name: "Anesteziologik yordam",   price: 300000 },
      { name: "Jarrohlik aralashuvi",    price: 800000 },
      { name: "Operatsion xona xizmati", price: 200000 },
    ],
  },
  {
    name: "Xoletsistektomiya",
    description: "O't pufagini olib tashlash",
    items: [
      { name: "Anesteziologik yordam",   price: 350000 },
      { name: "Laparoskopik jarrohlik",  price: 1200000 },
      { name: "Operatsion xona xizmati", price: 200000 },
    ],
  },
  {
    name: "Grija plastikasi",
    description: "Chov grija plastikasi",
    items: [
      { name: "Anesteziologik yordam",   price: 250000 },
      { name: "Plastika operatsiyasi",   price: 700000 },
      { name: "Operatsion xona xizmati", price: 200000 },
    ],
  },
];

const PATIENTS = [
  { first_name: "Alisher",  last_name: "Valiyev",    phone_number: "+998901234561", gender: "MALE",   birth_date: "1990-05-15", blood_type: "A_POSITIVE",  pinfl: "31505900012341" },
  { first_name: "Ozoda",    last_name: "Hasanova",   phone_number: "+998901234562", gender: "FEMALE", birth_date: "1985-08-20", blood_type: "O_POSITIVE",  pinfl: "32008850012342" },
  { first_name: "Zuhra",    last_name: "Karimova",   phone_number: "+998901234563", gender: "FEMALE", birth_date: "1995-12-10", blood_type: "B_NEGATIVE",  pinfl: "31012950012343" },
  { first_name: "Ulugbek",  last_name: "Rahimov",    phone_number: "+998901234564", gender: "MALE",   birth_date: "1988-03-25", blood_type: "AB_POSITIVE", pinfl: "32503880012344" },
  { first_name: "Kamola",   last_name: "Umarova",    phone_number: "+998901234565", gender: "FEMALE", birth_date: "2000-01-05", blood_type: "O_NEGATIVE",  pinfl: "30501000012345" },
  { first_name: "Nodir",    last_name: "Aliyev",     phone_number: "+998901234566", gender: "MALE",   birth_date: "1992-07-14", blood_type: "A_NEGATIVE",  pinfl: "31407920012346" },
  { first_name: "Feruza",   last_name: "Toshmatova", phone_number: "+998901234567", gender: "FEMALE", birth_date: "1998-11-30", blood_type: "B_POSITIVE",  pinfl: "33011980012347" },
  { first_name: "Sanjar",   last_name: "Ismoilov",   phone_number: "+998901234568", gender: "MALE",   birth_date: "1980-09-12", blood_type: "O_POSITIVE",  pinfl: "31209800012348" },
  { first_name: "Shahlo",   last_name: "Azimova",    phone_number: "+998901234569", gender: "FEMALE", birth_date: "1994-04-22", blood_type: "A_POSITIVE",  pinfl: "32204940012349" },
  { first_name: "Eldor",    last_name: "Rustamov",   phone_number: "+998901234570", gender: "MALE",   birth_date: "1987-06-18", blood_type: "AB_NEGATIVE", pinfl: "31806870012350" },
  { first_name: "Mohira",   last_name: "Sobirov",    phone_number: "+998901234571", gender: "FEMALE", birth_date: "2003-02-28", blood_type: "O_POSITIVE",  pinfl: "32802030012351" },
  { first_name: "Temur",    last_name: "Nazarov",    phone_number: "+998901234572", gender: "MALE",   birth_date: "1975-10-05", blood_type: "B_POSITIVE",  pinfl: "30510750012352" },
  { first_name: "Dilnoza",  last_name: "Yusupova",   phone_number: "+998901234573", gender: "FEMALE", birth_date: "1991-08-15", blood_type: "A_POSITIVE",  pinfl: "31508910012353" },
  { first_name: "Ravshan",  last_name: "Komilov",    phone_number: "+998901234574", gender: "MALE",   birth_date: "1983-12-20", blood_type: "O_NEGATIVE",  pinfl: "32012830012354" },
  { first_name: "Hulkar",   last_name: "Mirova",     phone_number: "+998901234575", gender: "FEMALE", birth_date: "1999-07-11", blood_type: "AB_POSITIVE", pinfl: "31107990012355" },
];

const MEDICINES = [
  "Paracetamol", "Ibuprofen", "Amoxicillin", "Metformin", "Atorvastatin",
  "Omeprazol", "Amlodipine", "Lisinopril", "Ciprofloxacin", "Diclofenac",
  "Pantoprazol", "Losartan", "Aspirin", "Azithromycin", "Dexamethasone",
  "Bisoprolol", "Furosemide", "Clindamycin", "Ceftriaxone", "Warfarin",
];

const SCHEDULES_WEEK = [
  { dayOfWeek: 1, startTime: "08:00", endTime: "17:00" },
  { dayOfWeek: 2, startTime: "08:00", endTime: "17:00" },
  { dayOfWeek: 3, startTime: "08:00", endTime: "17:00" },
  { dayOfWeek: 4, startTime: "08:00", endTime: "17:00" },
  { dayOfWeek: 5, startTime: "08:00", endTime: "15:00" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  const password = await bcrypt.hash("password123", 10);

  console.log("🚀 Test ma'lumotlar yuklanmoqda...\n");

  // ── 1. Region / District ───────────────────────────────────────────────────
  console.log("📍 Region va tumanlar...");
  let region = await prisma.region.findFirst({ where: { name: "Toshkent shahri" } });
  if (!region) {
    region = await prisma.region.create({ data: { name: "Toshkent shahri" } });
  }
  let district = await prisma.district.findFirst({ where: { regionId: region.id } });
  if (!district) {
    district = await prisma.district.create({
      data: { name: "Yunusobod tumani", regionId: region.id },
    });
  }
  console.log(`   ✓ ${region.name} / ${district.name}`);

  // ── 2. Departments ─────────────────────────────────────────────────────────
  console.log("🏥 Departamentlar...");
  const createdDeps: any[] = [];
  for (const dep of DEPARTMENTS) {
    const existing = await prisma.department.findFirst({ where: { name: dep.name } });
    if (existing) { createdDeps.push(existing); continue; }
    createdDeps.push(await prisma.department.create({ data: dep }));
  }
  console.log(`   ✓ ${createdDeps.length} ta departament`);

  // ── 3. Rooms ───────────────────────────────────────────────────────────────
  console.log("🚪 Xonalar...");
  const createdRooms: any[] = [];
  for (const room of ROOMS) {
    const existing = await prisma.room.findFirst({ where: { name: room.name } });
    if (existing) { createdRooms.push(existing); continue; }
    createdRooms.push(await prisma.room.create({ data: room as any }));
  }
  const operationRooms = createdRooms.filter((r) => r.roomType === "OPERATION");
  console.log(`   ✓ ${createdRooms.length} ta xona (${operationRooms.length} ta operatsion)`);

  // ── 4. Users ───────────────────────────────────────────────────────────────
  console.log("👥 Foydalanuvchilar...");
  const createdUsers: any[] = [];
  for (const u of USERS) {
    const existing = await prisma.user.findFirst({ where: { phone: u.phone } });
    if (existing) { createdUsers.push(existing); continue; }
    createdUsers.push(await prisma.user.create({
      data: {
        first_name: u.first_name,
        last_name: u.last_name,
        phone: u.phone,
        password,
        role: u.role as any,
        birthday: new Date(u.birthday),
      },
    }));
  }
  console.log(`   ✓ ${createdUsers.length} ta foydalanuvchi (parol: password123)`);

  const doctors   = createdUsers.filter((u) => u.role === "DOCTOR");
  const hamshiras = createdUsers.filter((u) => u.role === "HAMSHIRA");
  const labarant  = createdUsers.find((u) => u.role === "LABARANT")!;
  const diagnost  = createdUsers.find((u) => u.role === "DIAGNOST")!;
  const kassir    = createdUsers.find((u) => u.role === "KASSIR")!;

  // ── 5. Laboratories + Services ─────────────────────────────────────────────
  console.log("🔬 Laboratoriyalar...");
  const createdLabs: any[] = [];
  const allLabServices: any[] = [];
  for (const lab of LABORATORIES) {
    let labRec = await prisma.laboratory.findFirst({ where: { name: lab.name } });
    if (!labRec) {
      labRec = await prisma.laboratory.create({
        data: { name: lab.name, description: lab.description },
      });
    }
    createdLabs.push(labRec);
    for (const svc of lab.services) {
      const rows = (svc as any).defaultRows?.map((r: any, i: number) => ({ ...r, sortOrder: i }));
      let svcRec = await prisma.laboratoryService.findFirst({
        where: { name: svc.name, laboratoryId: labRec.id },
      });
      if (!svcRec) {
        svcRec = await prisma.laboratoryService.create({
          data: { name: svc.name, price: svc.price, laboratoryId: labRec.id, defaultRows: rows },
        });
      } else if (rows) {
        // Shablon avval bo'sh bo'lgan xizmat qayta seed qilinsa ham yangilanadi
        svcRec = await prisma.laboratoryService.update({
          where: { id: svcRec.id },
          data: { defaultRows: rows },
        });
      }
      allLabServices.push(svcRec);
    }
  }
  console.log(`   ✓ ${createdLabs.length} ta laboratoriya, ${allLabServices.length} ta xizmat`);

  // ── 6. Diagnostics + Services ──────────────────────────────────────────────
  console.log("🩻 Diagnostika markazlari...");
  const createdDiagnostics: any[] = [];
  const allDiagnosticServices: any[] = [];
  for (const diag of DIAGNOSTICS) {
    let diagRec = await prisma.diagnostics.findFirst({ where: { name: diag.name } });
    if (!diagRec) {
      diagRec = await prisma.diagnostics.create({
        data: { name: diag.name, description: diag.description },
      });
    }
    createdDiagnostics.push(diagRec);
    for (const svc of diag.services) {
      let svcRec = await prisma.diagnosticService.findFirst({
        where: { name: svc.name, diagnosticsId: diagRec.id },
      });
      if (!svcRec) {
        svcRec = await prisma.diagnosticService.create({
          data: { name: svc.name, price: svc.price, diagnosticsId: diagRec.id },
        });
      }
      allDiagnosticServices.push(svcRec);
    }
  }
  console.log(`   ✓ ${createdDiagnostics.length} ta diagnostika markazi, ${allDiagnosticServices.length} ta xizmat`);

  // ── 7. Operation Types ─────────────────────────────────────────────────────
  console.log("🔪 Operatsiya turlari...");
  const createdOpTypes: any[] = [];
  for (const opType of OPERATION_TYPES) {
    let existing = await prisma.operationType.findFirst({ where: { name: opType.name } });
    if (!existing) {
      existing = await prisma.operationType.create({
        data: {
          name: opType.name,
          description: opType.description,
          isActive: true,
          items: {
            create: opType.items.map((item) => ({
              name: item.name,
              price: item.price,
              isActive: true,
            })),
          },
        },
        include: { items: true },
      });
    } else {
      existing = await prisma.operationType.findUnique({
        where: { id: existing.id },
        include: { items: true },
      });
    }
    createdOpTypes.push(existing);
  }
  console.log(`   ✓ ${createdOpTypes.length} ta operatsiya turi`);

  // ── 8. Assignments (Doctor + Hamshira) ─────────────────────────────────────
  console.log("📋 Tayinlashlar (assignments)...");
  const createdAssignments: any[] = [];
  const examRooms = createdRooms.filter((r) => r.roomType === "EXAMINATION");

  for (let i = 0; i < doctors.length; i++) {
    const dep  = createdDeps[i % createdDeps.length];
    const room = examRooms[i % examRooms.length];
    let asgn = await prisma.assignment.findFirst({
      where: { userId: doctors[i].id, departmentId: dep.id },
    });
    if (!asgn) {
      asgn = await prisma.assignment.create({
        data: {
          userId: doctors[i].id,
          departmentId: dep.id,
          roomId: room.id,
          isActive: true,
          schedules: { create: SCHEDULES_WEEK },
        },
      });
    }
    createdAssignments.push(asgn);
  }

  for (let i = 0; i < hamshiras.length; i++) {
    const dep  = createdDeps[i % createdDeps.length];
    const room = examRooms[i % examRooms.length];
    let asgn = await prisma.assignment.findFirst({
      where: { userId: hamshiras[i].id, departmentId: dep.id },
    });
    if (!asgn) {
      asgn = await prisma.assignment.create({
        data: {
          userId: hamshiras[i].id,
          departmentId: dep.id,
          roomId: room.id,
          isActive: true,
          schedules: { create: SCHEDULES_WEEK },
        },
      });
    }
    createdAssignments.push(asgn);
  }
  console.log(`   ✓ ${createdAssignments.length} ta assignment`);

  // ── 9. LaboratoryAssignments ───────────────────────────────────────────────
  console.log("🧪 Labarant tayinlashlari...");
  const firstLab = createdLabs[0];
  const existingLabAsgn = await prisma.laboratoryAssignment.findFirst({
    where: { userId: labarant.id, laboratoryId: firstLab.id },
  });
  if (!existingLabAsgn) {
    await prisma.laboratoryAssignment.create({
      data: { userId: labarant.id, laboratoryId: firstLab.id, isActive: true },
    });
  }
  console.log(`   ✓ Labarant → ${firstLab.name}`);

  // ── 10. DiagnosticAssignments ──────────────────────────────────────────────
  console.log("🩻 Diagnost tayinlashlari...");
  if (diagnost) {
    for (const diagRec of createdDiagnostics) {
      const existing = await prisma.diagnosticAssignment.findFirst({
        where: { userId: diagnost.id, diagnosticsId: diagRec.id },
      });
      if (!existing) {
        await prisma.diagnosticAssignment.create({
          data: { userId: diagnost.id, diagnosticsId: diagRec.id, isActive: true },
        });
      }
    }
    console.log(`   ✓ Diagnost → ${createdDiagnostics.length} ta markaz`);
  }

  // ── 11. Patients ────────────────────────────────────────────────────────────
  console.log("🏥 Bemorlar...");
  const createdPatients: any[] = [];
  for (const pat of PATIENTS) {
    const existing = await prisma.patient.findFirst({ where: { phone_number: pat.phone_number } });
    if (existing) { createdPatients.push(existing); continue; }
    createdPatients.push(await prisma.patient.create({
      data: {
        first_name:      pat.first_name,
        last_name:       pat.last_name,
        phone_number:    pat.phone_number,
        gender:          pat.gender,
        birth_date:      new Date(pat.birth_date),
        blood_type:      pat.blood_type as any,
        document_type:   "PASSPORT",
        document_series: "AA",
        document_number: `${7000000 + createdPatients.length}`,
        pinfl:           pat.pinfl,
        districtId:      district.id,
      },
    }));
  }
  console.log(`   ✓ ${createdPatients.length} ta bemor`);

  // ── 12. Medicines ──────────────────────────────────────────────────────────
  console.log("💊 Dorilar...");
  const createdMeds: any[] = [];
  for (const name of MEDICINES) {
    let m = await prisma.medicine.findFirst({ where: { name } });
    if (!m) m = await prisma.medicine.create({ data: { name } });
    createdMeds.push(m);
  }
  console.log(`   ✓ ${createdMeds.length} ta dori`);

  // ── 13. PatientCases → Steps → Appointments → Prescriptions ───────────────
  console.log("📁 Keyslar va uchrashuvlar...");
  let casesCreated = 0;
  let apptsCreated = 0;
  let prescCreated = 0;

  for (let pi = 0; pi < createdPatients.length; pi++) {
    const patient  = createdPatients[pi];
    const asgn     = createdAssignments[pi % createdAssignments.length];
    const daysBack = (pi + 1) * 3;

    const patCase = await prisma.patientCase.create({
      data: {
        patientId:      patient.id,
        status:         pi < 10 ? "ACTIVE" : "COMPLETED",
        chiefComplaint: pick([
          "Bosh og'rig'i va ko'ngil aynishi",
          "Yurak sohasida og'riq",
          "Nafas qisishi va yo'tal",
          "Qorin og'rig'i",
          "Oyoq-qo'l og'rig'i",
          "Ko'z og'rig'i va ko'rish pasayishi",
          "Tish og'rig'i",
          "Bel og'rig'i",
          "Umumiy holsizlik va isitma",
          "Quloq og'rig'i",
        ]),
        openedAt: daysAgo(daysBack),
        closedAt: pi >= 10 ? daysAgo(1) : null,
      },
    });
    casesCreated++;

    // CHECKIN step
    await prisma.caseStep.create({
      data: {
        caseId:      patCase.id,
        type:        "CHECKIN",
        status:      "DONE",
        completedAt: daysAgo(daysBack),
      },
    });

    // CONSULTATION step + Appointment
    const apptDate = daysAgo(daysBack - 1);
    const appt = await prisma.appointment.create({
      data: {
        dateTime:    apptDate,
        patientId:   patient.id,
        assignmentId: asgn.id,
      },
    });
    apptsCreated++;

    await prisma.caseStep.create({
      data: {
        caseId:       patCase.id,
        type:         "CONSULTATION",
        status:       pi < 5 ? "IN_PROGRESS" : "DONE",
        assignmentId: asgn.id,
        appointmentId: appt.id,
        note:         "Bemor ko'rildi. Muolaja belgilandi.",
        completedAt:  pi >= 5 ? daysAgo(daysBack - 1) : null,
      },
    });

    // Prescription for some patients
    if (pi % 2 === 0) {
      await prisma.prescription.create({
        data: {
          appointmentId: appt.id,
          items: {
            create: [
              {
                medicineId:   createdMeds[pi % createdMeds.length].id,
                dosage:       "1 tablet",
                frequency:    3,
                startDate:    daysAgo(daysBack - 2),
                endDate:      daysAgo(daysBack - 9),
                mealRelation: "AFTER_MEAL",
                note:         "Ovqatdan keyin ichilsin",
              },
              {
                medicineId:   createdMeds[(pi + 1) % createdMeds.length].id,
                dosage:       "500mg",
                frequency:    2,
                startDate:    daysAgo(daysBack - 2),
                endDate:      daysAgo(daysBack - 7),
                mealRelation: "BEFORE_MEAL",
              },
            ],
          },
        },
      });
      prescCreated++;
    }
  }
  console.log(`   ✓ ${casesCreated} ta keys, ${apptsCreated} ta uchrashuv, ${prescCreated} ta retsept`);

  // ── 14. LabOrders ──────────────────────────────────────────────────────────
  console.log("🧬 Lab buyurtmalari...");
  let labOrdersCreated = 0;

  for (let pi = 0; pi < Math.min(6, createdPatients.length); pi++) {
    const patient = createdPatients[pi];
    const patCase = await prisma.patientCase.findFirst({ where: { patientId: patient.id } });
    if (!patCase) continue;

    const lab         = createdLabs[pi % createdLabs.length];
    const labServices = allLabServices.filter((s: any) => s.laboratoryId === lab.id).slice(0, 2);
    if (!labServices.length) continue;

    const labStep = await prisma.caseStep.create({
      data: {
        caseId:      patCase.id,
        type:        "LAB",
        status:      pi < 2 ? "IN_PROGRESS" : "DONE",
        completedAt: pi >= 2 ? daysAgo(1) : null,
      },
    });

    const orderStatus = pi === 0 ? "PENDING" : pi === 1 ? "IN_PROGRESS" : "COMPLETED";

    const labOrder = await prisma.labOrder.create({
      data: {
        status:      orderStatus as any,
        caseStepId:  labStep.id,
        patientId:   patient.id,
        laboratoryId: lab.id,
      },
    });

    for (const svc of labServices) {
      const itemStatus = pi === 0 ? "PENDING" : pi === 1 ? "IN_PROGRESS" : pi <= 3 ? "READY" : "DELIVERED";
      await prisma.labOrderItem.create({
        data: {
          labOrderId:  labOrder.id,
          serviceId:   svc.id,
          status:      itemStatus as any,
          note:        pi >= 2 ? "Natija normal chegarada" : null,
          completedAt: pi >= 2 ? daysAgo(1) : null,
          startedAt:   pi >= 1 ? daysAgo(2) : null,
          readyAt:     pi >= 2 ? daysAgo(1) : null,
          deliveredAt: pi >= 4 ? daysAgo(0) : null,
        },
      });
    }
    labOrdersCreated++;
  }
  console.log(`   ✓ ${labOrdersCreated} ta lab buyurtma`);

  // ── 15. DiagnosticOrders ───────────────────────────────────────────────────
  console.log("🩻 Diagnostika buyurtmalari...");
  let diagnosticOrdersCreated = 0;

  // 6 ta bemor uchun turli statusdagi diagnostika buyurtmalari
  // (lab bilan bir xil bemor ishlatmaslik uchun 6..11 oralig'idan olamiz)
  for (let pi = 6; pi < Math.min(12, createdPatients.length); pi++) {
    const localIdx = pi - 6; // 0..5
    const patient  = createdPatients[pi];
    const patCase  = await prisma.patientCase.findFirst({ where: { patientId: patient.id } });
    if (!patCase) continue;

    const diagRec    = createdDiagnostics[localIdx % createdDiagnostics.length];
    const diagSvcs   = allDiagnosticServices
      .filter((s: any) => s.diagnosticsId === diagRec.id)
      .slice(0, 2);
    if (!diagSvcs.length) continue;

    const diagStep = await prisma.caseStep.create({
      data: {
        caseId:      patCase.id,
        type:        "DIAGNOSTIC",
        status:      localIdx < 2 ? "IN_PROGRESS" : "DONE",
        completedAt: localIdx >= 2 ? daysAgo(1) : null,
      },
    });

    const orderStatus =
      localIdx === 0 ? "PENDING" :
      localIdx === 1 ? "IN_PROGRESS" :
      "COMPLETED";

    const diagOrder = await prisma.diagnosticOrder.create({
      data: {
        status:       orderStatus as any,
        caseStepId:   diagStep.id,
        patientId:    patient.id,
        diagnosticsId: diagRec.id,
      },
    });

    for (const svc of diagSvcs) {
      const itemStatus =
        localIdx === 0 ? "PENDING" :
        localIdx === 1 ? "IN_PROGRESS" :
        localIdx <= 3  ? "READY" :
        "DELIVERED";

      await prisma.diagnosticOrderItem.create({
        data: {
          diagnosticOrderId: diagOrder.id,
          serviceId:         svc.id,
          status:            itemStatus as any,
          note:              localIdx >= 2 ? "Patologiya aniqlanmadi" : null,
          completedAt:       localIdx >= 2 ? daysAgo(1) : null,
          startedAt:         localIdx >= 1 ? daysAgo(2) : null,
          readyAt:           localIdx >= 2 ? daysAgo(1) : null,
          deliveredAt:       localIdx >= 4 ? daysAgo(0) : null,
        },
      });
    }
    diagnosticOrdersCreated++;
  }
  console.log(`   ✓ ${diagnosticOrdersCreated} ta diagnostika buyurtma`);

  // ── 16. Operations ─────────────────────────────────────────────────────────
  console.log("🔪 Operatsiyalar...");
  let opsCreated = 0;

  const opScenarios = [
    { pi: 0,  oti: 0, status: "COMPLETED",   daysBack: 10, startOffset: -9, completeOffset: -8 },
    { pi: 1,  oti: 1, status: "COMPLETED",   daysBack: 7,  startOffset: -6, completeOffset: -5 },
    { pi: 2,  oti: 2, status: "IN_PROGRESS", daysBack: 0,  startOffset: 0,  completeOffset: null },
    { pi: 3,  oti: 0, status: "SCHEDULED",   daysBack: -1, startOffset: null, completeOffset: null },
    { pi: 4,  oti: 1, status: "SCHEDULED",   daysBack: -2, startOffset: null, completeOffset: null },
    { pi: 5,  oti: 2, status: "CANCELLED",   daysBack: 5,  startOffset: null, completeOffset: null },
  ];

  for (const sc of opScenarios) {
    const patient = createdPatients[sc.pi];
    const opType  = createdOpTypes[sc.oti];
    const opRoom  = operationRooms[sc.oti % operationRooms.length];

    let patCase = await prisma.patientCase.findFirst({ where: { patientId: patient.id } });
    if (!patCase) {
      patCase = await prisma.patientCase.create({
        data: { patientId: patient.id, status: "ACTIVE", openedAt: daysAgo(sc.daysBack + 2) },
      });
    }

    const caseStepStatus =
      sc.status === "COMPLETED" ? "DONE" :
      sc.status === "CANCELLED" ? "CANCELLED" :
      sc.status === "IN_PROGRESS" ? "IN_PROGRESS" : "PENDING";

    const caseStep = await prisma.caseStep.create({
      data: {
        caseId:      patCase.id,
        type:        "OPERATION",
        status:      caseStepStatus,
        completedAt: sc.status === "COMPLETED" ? daysAgo(Math.abs(sc.completeOffset!)) : null,
      },
    });

    const scheduledAt = sc.daysBack < 0 ? hoursFromNow(Math.abs(sc.daysBack) * 24) : daysAgo(sc.daysBack);
    const startedAt   = sc.startOffset !== null && sc.status !== "SCHEDULED" && sc.status !== "CANCELLED"
      ? daysAgo(Math.abs(sc.startOffset!))
      : null;
    const completedAt = sc.completeOffset !== null
      ? daysAgo(Math.abs(sc.completeOffset!))
      : null;

    const opItems = opType.items.map((item: any) => ({
      operationTypeItemId: item.id,
      name:       item.name,
      unitPrice:  item.price,
      quantity:   1,
      totalPrice: item.price,
    }));

    const totalPrice = opItems.reduce((sum: number, i: any) => sum + Number(i.unitPrice), 0);

    const operation = await prisma.operation.create({
      data: {
        patientId:       patient.id,
        operationTypeId: opType.id,
        roomId:          opRoom?.id ?? null,
        caseStepId:      caseStep.id,
        status:          sc.status as any,
        scheduledAt,
        startedAt,
        completedAt,
        totalPrice,
        note: `${opType.name} operatsiyasi`,
        surgeons: {
          create: [
            { surgeonId: doctors[0].id, role: "LEAD" },
            { surgeonId: doctors[1 % doctors.length].id, role: "ASSISTANT" },
          ],
        },
        items: { create: opItems },
      },
    });

    if (sc.status === "COMPLETED") {
      await prisma.invoice.create({
        data: {
          patientId:   patient.id,
          sourceType:  "OPERATION",
          sourceId:    operation.id,
          totalAmount: totalPrice,
          status:      "ISSUED",
          createdById: kassir.id,
          items: {
            create: opItems.map((item: any) => ({
              description: item.name,
              quantity:    item.quantity,
              unitPrice:   item.unitPrice,
              totalPrice:  item.totalPrice,
              sourceType:  "OPERATION",
              sourceId:    operation.id,
            })),
          },
        },
      });
    }

    opsCreated++;
  }
  console.log(`   ✓ ${opsCreated} ta operatsiya (2 COMPLETED, 1 IN_PROGRESS, 2 SCHEDULED, 1 CANCELLED)`);

  // ── 17. MedicalCards ───────────────────────────────────────────────────────
  console.log("📄 Tibbiy kartalar (003-shakl)...");
  let cardsCreated = 0;
  const doctorUser = doctors[0];

  for (let i = 0; i < Math.min(5, createdPatients.length); i++) {
    const patient  = createdPatients[i];
    const existing = await prisma.medicalCard003.findFirst({ where: { patientId: patient.id } });
    if (existing) continue;

    await prisma.medicalCard003.create({
      data: {
        patientId:       patient.id,
        admissionDate:   daysAgo(10 + i),
        dischargeDate:   i < 3 ? daysAgo(i + 1) : null,
        wardNumber:      `20${i + 1}`,
        departmentName:  createdDeps[i % createdDeps.length].name,
        doctorName:      `${doctorUser.first_name} ${doctorUser.last_name}`,
        nurseName:       hamshiras.length ? `${hamshiras[0].first_name} ${hamshiras[0].last_name}` : null,
        complaints:      "Bosh og'rig'i, umumiy holsizlik, isitma 38.5°C",
        anamnesis:       "Kasallik 3 kun oldin boshlangan. Dastlab harorat ko'tarilgan.",
        lifeAnamnesis:   "Gipertoniya - 5 yil. Allergiya anamnezi salbiy.",
        diagnosisInitial: pick(["J18.9 Pnevmoniya", "I10 Gipertoniya", "K29.7 Gastrit", "M54.5 Bel og'rig'i"]),
        diagnosisFinal:   i < 3 ? pick(["J18.9 Pnevmoniya, o'ng tomonlama", "I10 Gipertoniya, 2-daraja"]) : null,
        treatment:       "1. Ceftriaxone 1g/24s iv\n2. Paracetamol 500mg\n3. Mukolit preparatlar",
        dailyNotes: JSON.stringify([
          { date: daysAgo(9 + i).toISOString().split("T")[0], note: "Holati o'rta og'ir. Harorat 37.8°C." },
          { date: daysAgo(8 + i).toISOString().split("T")[0], note: "Holati yaxshilandi. Harorat 37.1°C." },
          { date: daysAgo(7 + i).toISOString().split("T")[0], note: "Holati qoniqarli. Harorat normada." },
        ]),
      },
    });
    cardsCreated++;
  }
  console.log(`   ✓ ${cardsCreated} ta tibbiy karta`);

  // ── 18. Kelgusi uchrashuvlar ───────────────────────────────────────────────
  console.log("📅 Kelgusi uchrashuvlar...");
  let futureAppts = 0;
  for (let i = 0; i < Math.min(5, createdPatients.length); i++) {
    const patient = createdPatients[i];
    const asgn    = createdAssignments[i % createdAssignments.length];
    await prisma.appointment.create({
      data: {
        dateTime:     hoursFromNow(i * 2 + 1),
        patientId:    patient.id,
        assignmentId: asgn.id,
      },
    });
    futureAppts++;
  }
  console.log(`   ✓ ${futureAppts} ta kelgusi uchrashuv`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const [
    totalPatients, totalUsers, totalAppointments,
    totalLabs, totalDiagnostics, totalCases, totalOps, totalInvoices,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.user.count(),
    prisma.appointment.count(),
    prisma.labOrder.count(),
    prisma.diagnosticOrder.count(),
    prisma.patientCase.count(),
    prisma.operation.count(),
    prisma.invoice.count(),
  ]);

  console.log("\n✅ Seed muvaffaqiyatli yakunlandi!\n");
  console.log("📊 Jami ma'lumotlar:");
  console.log(`   👥 Foydalanuvchilar       : ${totalUsers}`);
  console.log(`   🏥 Bemorlar               : ${totalPatients}`);
  console.log(`   📅 Uchrashuvlar           : ${totalAppointments}`);
  console.log(`   📁 Keyslar                : ${totalCases}`);
  console.log(`   🧬 Lab buyurtmalar        : ${totalLabs}`);
  console.log(`   🩻 Diagnostika buyurtmalar: ${totalDiagnostics}`);
  console.log(`   🔪 Operatsiyalar          : ${totalOps}`);
  console.log(`   🧾 Invoicelar             : ${totalInvoices}`);
  console.log(`\n   🔑 Barcha xodimlar paroli: password123`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed xatosi:", e);
  process.exit(1);
});