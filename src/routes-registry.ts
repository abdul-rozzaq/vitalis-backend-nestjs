/**
 * Barcha API route-larining ro'yxati.
 * Frontend permission matrix ni shu ma'lumot asosida quriladi.
 * Yangi route qo'shilganda shu ro'yxatni ham yangilang.
 */

export type RouteEntry = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  description: string;
  group: string;
};

export const ROUTES_REGISTRY: RouteEntry[] = [
  // ─── Users ────────────────────────────────────────────────────────────────
  {
    group: "Foydalanuvchilar",
    method: "GET",
    path: "/api/users",
    description: "Barcha foydalanuvchilar",
  },
  {
    group: "Foydalanuvchilar",
    method: "GET",
    path: "/api/users/:id",
    description: "Foydalanuvchi (ID bo'yicha)",
  },
  {
    group: "Foydalanuvchilar",
    method: "POST",
    path: "/api/users",
    description: "Yangi foydalanuvchi",
  },
  {
    group: "Foydalanuvchilar",
    method: "PUT",
    path: "/api/users/:id",
    description: "Foydalanuvchi tahrirlash",
  },
  {
    group: "Foydalanuvchilar",
    method: "DELETE",
    path: "/api/users/:id",
    description: "Foydalanuvchi o'chirish",
  },

  // ─── Patients ─────────────────────────────────────────────────────────────
  {
    group: "Patients",
    method: "GET",
    path: "/api/patients",
    description: "Barcha bemorlar",
  },
  {
    group: "Patients",
    method: "GET",
    path: "/api/patients/:id",
    description: "Bemor (ID bo'yicha)",
  },
  {
    group: "Patients",
    method: "POST",
    path: "/api/patients",
    description: "Yangi bemor",
  },
  {
    group: "Patients",
    method: "PATCH",
    path: "/api/patients/:id",
    description: "Bemor tahrirlash",
  },
  {
    group: "Patients",
    method: "DELETE",
    path: "/api/patients/:id",
    description: "Bemor o'chirish",
  },
  {
    group: "Patients",
    method: "GET",
    path: "/api/patients/:id/timeline",
    description: "Bemor timeline",
  },

  // ─── Departments ──────────────────────────────────────────────────────────
  {
    group: "Departments",
    method: "GET",
    path: "/api/departments",
    description: "Barcha bo'limlar",
  },
  {
    group: "Departments",
    method: "GET",
    path: "/api/departments/:id",
    description: "Bo'lim (ID bo'yicha)",
  },
  {
    group: "Departments",
    method: "POST",
    path: "/api/departments",
    description: "Yangi bo'lim",
  },
  {
    group: "Departments",
    method: "PATCH",
    path: "/api/departments/:id",
    description: "Bo'lim tahrirlash",
  },
  {
    group: "Departments",
    method: "DELETE",
    path: "/api/departments/:id",
    description: "Bo'lim o'chirish",
  },

  // ─── Rooms ────────────────────────────────────────────────────────────────
  {
    group: "Rooms",
    method: "GET",
    path: "/api/rooms",
    description: "Barcha xonalar",
  },
  {
    group: "Rooms",
    method: "GET",
    path: "/api/rooms/:id",
    description: "Xona (ID bo'yicha)",
  },
  {
    group: "Rooms",
    method: "POST",
    path: "/api/rooms",
    description: "Yangi xona",
  },
  {
    group: "Rooms",
    method: "PATCH",
    path: "/api/rooms/:id",
    description: "Xona tahrirlash",
  },
  {
    group: "Rooms",
    method: "DELETE",
    path: "/api/rooms/:id",
    description: "Xona o'chirish",
  },

  // ─── Assignments ──────────────────────────────────────────────────────────
  {
    group: "Assignments",
    method: "GET",
    path: "/api/assignments",
    description: "Barcha tayinlovlar",
  },
  {
    group: "Assignments",
    method: "GET",
    path: "/api/assignments/:id",
    description: "Tayinlov (ID bo'yicha)",
  },
  {
    group: "Assignments",
    method: "POST",
    path: "/api/assignments",
    description: "Yangi tayinlov",
  },
  {
    group: "Assignments",
    method: "PATCH",
    path: "/api/assignments/:id",
    description: "Tayinlov tahrirlash",
  },
  {
    group: "Assignments",
    method: "DELETE",
    path: "/api/assignments/:id",
    description: "Tayinlov o'chirish",
  },

  // ─── Payments ─────────────────────────────────────────────────────────────
  {
    group: "Payments",
    method: "GET",
    path: "/api/payments",
    description: "Barcha to'lovlar",
  },
  {
    group: "Payments",
    method: "GET",
    path: "/api/payments/:id",
    description: "To'lov (ID bo'yicha)",
  },
  {
    group: "Payments",
    method: "POST",
    path: "/api/payments",
    description: "Yangi to'lov",
  },
  {
    group: "Payments",
    method: "PATCH",
    path: "/api/payments/:id",
    description: "To'lov tahrirlash",
  },
  {
    group: "Payments",
    method: "DELETE",
    path: "/api/payments/:id",
    description: "To'lov o'chirish",
  },

  // ─── Appointments ─────────────────────────────────────────────────────────
  {
    group: "Appointments",
    method: "GET",
    path: "/api/appointments",
    description: "Barcha uchrashuvlar",
  },
  {
    group: "Appointments",
    method: "GET",
    path: "/api/appointments/:id",
    description: "Uchrashuv (ID bo'yicha)",
  },
  {
    group: "Appointments",
    method: "POST",
    path: "/api/appointments",
    description: "Yangi uchrashuv",
  },
  {
    group: "Appointments",
    method: "PATCH",
    path: "/api/appointments/:id",
    description: "Uchrashuv tahrirlash",
  },
  {
    group: "Appointments",
    method: "POST",
    path: "/api/appointments/:id/files",
    description: "Uchrashuvga fayl biriktirish",
  },
  {
    group: "Appointments",
    method: "DELETE",
    path: "/api/appointments/:id",
    description: "Uchrashuv o'chirish",
  },
  // ─── Uploads ──────────────────────────────────────────────────────────────
  {
    group: "Yuklashlar",
    method: "POST",
    path: "/api/uploads/photo",
    description: "Rasm yuklash",
  },
  {
    group: "Yuklashlar",
    method: "POST",
    path: "/api/uploads/file",
    description: "Fayl yuklash",
  },

  // ─── Medicines ────────────────────────────────────────────────────────────
  {
    group: "Dorilar",
    method: "GET",
    path: "/api/medicines",
    description: "Barcha dorilar",
  },
  {
    group: "Dorilar",
    method: "POST",
    path: "/api/medicines/upsert",
    description: "Dori topish yoki yaratish",
  },

  // ─── Prescriptions ────────────────────────────────────────────────────────
  {
    group: "Receptlar",
    method: "GET",
    path: "/api/prescriptions",
    description: "Uchrashuv recepti",
  },
  {
    group: "Receptlar",
    method: "GET",
    path: "/api/prescriptions/:id/print",
    description: "Receptni chop etish uchun HTML",
  },
  {
    group: "Receptlar",
    method: "POST",
    path: "/api/prescriptions",
    description: "Recept saqlash (upsert)",
  },
  {
    group: "Receptlar",
    method: "DELETE",
    path: "/api/prescriptions/:id",
    description: "Receptni o'chirish",
  },

  // ─── Patient Cases ─────────────────────────────────────────────────────────
  {
    group: "Cases",
    method: "POST",
    path: "/api/cases",
    description: "Yangi bemor ishi (check-in)",
  },
  {
    group: "Cases",
    method: "GET",
    path: "/api/cases/:id",
    description: "Ish tafsiloti",
  },
  {
    group: "Cases",
    method: "POST",
    path: "/api/cases/:id/steps",
    description: "Ishga qadam qo'shish",
  },
  {
    group: "Cases",
    method: "PATCH",
    path: "/api/cases/:id/steps/:id",
    description: "Qadam holatini yangilash",
  },
  {
    group: "Cases",
    method: "PATCH",
    path: "/api/cases/:id/close",
    description: "Ishni yopish",
  },
  {
    group: "Cases",
    method: "GET",
    path: "/api/patients/:id/cases",
    description: "Bemorning ishlari",
  },
];
