// @ts-nocheck

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PaymentMethod } from "../../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

// export const patients = [
//   { first_name: "Ali", last_name: "Valiyev", phone_number: "+998901234561", gender: "MALE", birth_date: new Date("1990-05-15") },
//   { first_name: "Olim", last_name: "Hasanov", phone_number: "+998901234562", gender: "MALE", birth_date: new Date("1985-08-20") },
//   { first_name: "Zuhra", last_name: "Karimova", phone_number: "+998901234563", gender: "FEMALE", birth_date: new Date("1995-12-10") },
//   { first_name: "Sardor", last_name: "Rahimov", phone_number: "+998901234564", gender: "MALE", birth_date: new Date("1988-03-25") },
//   { first_name: "Nigora", last_name: "Umarova", phone_number: "+998901234565", gender: "FEMALE", birth_date: new Date("2000-01-05") },
//   { first_name: "Jasur", last_name: "Aliyev", phone_number: "+998901234566", gender: "MALE", birth_date: new Date("1992-07-14") },
//   { first_name: "Malika", last_name: "Toshmatova", phone_number: "+998901234567", gender: "FEMALE", birth_date: new Date("1998-11-30") },
//   { first_name: "Botir", last_name: "Ismoilov", phone_number: "+998901234568", gender: "MALE", birth_date: new Date("1980-09-12") },
//   { first_name: "Lola", last_name: "Azimova", phone_number: "+998901234569", gender: "FEMALE", birth_date: new Date("1994-04-22") },
//   { first_name: "Akmal", last_name: "Rustamov", phone_number: "+998901234570", gender: "MALE", birth_date: new Date("1987-06-18") },
// ];

export const rooms = [
  { name: "Room 1",  roomType: "EXAMINATION", capacity: 1 },
  { name: "Room 2",  roomType: "EXAMINATION", capacity: 1 },
  { name: "Room 3",  roomType: "EXAMINATION", capacity: 1 },
  { name: "Room 4",  roomType: "EXAMINATION", capacity: 1 },
  { name: "Room 5",  roomType: "EXAMINATION", capacity: 1 },
  { name: "Room 6",  roomType: "WARD",        capacity: 4 },
  { name: "Room 7",  roomType: "WARD",        capacity: 4 },
  { name: "Room 8",  roomType: "WARD",        capacity: 6 },
  { name: "Room 9",  roomType: "WARD",        capacity: 6 },
  { name: "Room 10", roomType: "WARD",        capacity: 8 },
];

export const departments = [
  { name: "Kardiologiya", description: "Yurak kasalliklari bo'limi" },
  { name: "Nevrologiya", description: "Asab tizimi kasalliklari" },
  { name: "Stomatologiya", description: "Tish davolash markazi" },
  { name: "Pediatriya", description: "Bolalar bo'limi" },
  { name: "Xirurgiya", description: "Umumiy jarrohlik" },
  { name: "Ginekologiya", description: "Ayollar salomatligi" },
  { name: "Oftalmologiya", description: "Ko'z kasalliklari" },
  { name: "LOR", description: "Quloq, burun, tomoq" },
  { name: "Urologiya", description: "Peshob yo'llari kasalliklari" },
  { name: "Terapevt", description: "Umumiy ko'rik bo'limi" },
];

async function main() {
  console.log("Seed boshlandi...");

  const adapter = new PrismaPg({
    connectionString: connectionString,
  });

  const prisma = new PrismaClient({ adapter });

  // 1. Departmanlarni yaratish
  const createdDeps = [];

  for (const dep of departments) {
    const d = await prisma.department.create({ data: dep });
    createdDeps.push(d);
  }

  // 2. Xonalarni yaratish
  for (const room of rooms) {
    await prisma.room.create({ data: room });
  }

  // 3. Bemorlarni yaratish
  // const createdPatients = [];
  // for (const pat of patients) {
  //   const p = await prisma.patient.create({ data: pat });
  //   createdPatients.push(p);
  // }

  console.log("Seed muvaffaqiyatli yakunlandi!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
