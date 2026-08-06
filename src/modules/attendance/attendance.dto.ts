import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// ─── Webhook Event DTO ────────────────────────────────────────────────────────

/**
 * Hikvision event_log.AccessControllerEvent ichidagi kerakli maydonlar.
 * Qurilma multipart/form-data orqali event_log ni stringified JSON sifatida yuboradi.
 * Listener (hikvision-listener/index.js) buni parse qilib body.json ga yozadi —
 * biz esa shu formani to'g'ridan-to'g'ri webhook'da parse qilamiz.
 */
export class HikvisionEventDto {
  /** Qurilma IP manzili (event_log.ipAddress) */
  deviceIp: string;

  /** Qurilmaning ISO timestamp'i — Asia/Tashkent ofseti bilan keladi */
  eventAt: Date;

  /** "checkIn" | "checkOut" */
  rawStatus: string;

  /** Terminalda ro'yxatdan o'tgan xodim raqami (employeeNoString) */
  employeeNoStr: string;
}

// ─── Admin API DTOs ───────────────────────────────────────────────────────────

export class AttendanceRecordsQueryDto {
  /** YYYY-MM-DD formatida sana filter */
  @IsOptional()
  @IsString()
  date?: string;

  /** from/to oralig'i (YYYY-MM-DD) */
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class PatchAttendanceRecordDto {
  /** Admin tomonidan qo'lda tushiriladigan izoh */
  @IsOptional()
  @IsString()
  note?: string;
}

/** Terminal ID ni xodimga bog'lash. */
export class LinkEmployeeDto {
  @IsUUID()
  userId: string;
}

/** `NO_SHIFT` skanini smenaga bog'lash. */
export class ResolveToShiftDto {
  @IsUUID()
  shiftId: string;
}

/**
 * Qo'lda tuzatish. `null` yuborilsa avvalgi qo'lda kiritilgan qiymat
 * bekor qilinadi va yozuv faqat xom skanlardan qayta hisoblanadi.
 */
export class AdjustAttendanceRecordDto {
  @IsOptional()
  @IsISO8601()
  checkInAt?: string | null;

  @IsOptional()
  @IsISO8601()
  checkOutAt?: string | null;

  /** Sabab majburiy — audit izi ma'nosiz bo'lib qolmasligi uchun. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AttendanceEventsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
