import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Ip,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  Body,
  Logger,
  HttpCode,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID, timingSafeEqual } from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { AttendanceService } from './attendance.service';
import { HikvisionEventDto } from './attendance.dto';

// ─── Multer config for face images ───────────────────────────────────────────

const ATTENDANCE_UPLOAD_DIR = './uploads/attendance';

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

const attendanceMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      ensureDir(ATTENDANCE_UPLOAD_DIR);
      cb(null, ATTENDANCE_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
};

// ─── Controller ──────────────────────────────────────────────────────────────

@Public() // JWT guard o'tkazib yuboriladi — qurilma token yubormaydigan
@Controller('attendance')
export class AttendanceWebhookController {
  private readonly logger = new Logger(AttendanceWebhookController.name);

  constructor(private readonly service: AttendanceService) {}

  /**
   * Hikvision Face ID terminal webhook endpoint.
   *
   * Qurilma bu URL'ga multipart/form-data POST qiladi:
   *   POST /attendance/webhook?secret=<ATTENDANCE_WEBHOOK_SECRET>
   *
   * Body:
   *   - event_log: stringified JSON (AccessControllerEvent)
   *   - Picture.jpg (ixtiyoriy): yuzdagi surat
   */
  @Post('webhook')
  @HttpCode(200)
  @UseInterceptors(AnyFilesInterceptor(attendanceMulterOptions))
  async receiveWebhook(
    @Query('secret') secret: string,
    @Ip() clientIp: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    let dto: HikvisionEventDto;
    let picturePath: string | null;

    try {
      // 1. Secret tekshiruvi — timing-safe comparison
      this.validateSecret(secret);

      // 2. IP whitelist tekshiruvi (agar sozlangan bo'lsa)
      this.validateIp(clientIp);

      // 3. event_log parse
      dto = this.parseEventLog(body, clientIp);

      // 4. Rasm yo'lini topish (Picture.jpg yoki birinchi fayl)
      const pictureFile = (files ?? []).find(
        (f) => f.fieldname === 'Picture' || f.mimetype.startsWith('image/'),
      );
      
      picturePath = pictureFile
        ? `/uploads/attendance/${pictureFile.filename}`
        : null;
    } catch (error: any) {
      // Yaroqsiz payload qayta yuborilsa ham tuzalmaydi. Terminalning cheksiz
      // retry loop'iga tushmasligi uchun bunday so'rovga 200 qaytaramiz.
      this.logger.warn(`Webhook payload rejected: ${error.message}`);
      return { ok: false, error: error.message };
    }

    try {
      // DB yoki ichki ishlov vaqtincha yiqilsa 5xx qaytishi shart: aks holda
      // terminal hodisani yetkazilgan deb hisoblab, uni boshqa yubormaydi.
      await this.service.processEvent(dto, picturePath);
      return { ok: true };
    } catch (error: any) {
      this.logger.error(`Webhook processing failed; requesting retry: ${error.message}`);
      throw new ServiceUnavailableException('Attendance event could not be persisted');
    }
  }

  // ─── Validation helpers ─────────────────────────────────────────────────────

  private validateSecret(incoming: string | undefined): void {
    const expected = process.env.ATTENDANCE_WEBHOOK_SECRET ?? '';
    if (!incoming) {
      throw new Error('Missing secret query param');
    }

    // timingSafeEqual ikki Buffer teng uzunlikda bo'lishini talab qiladi.
    // Padding bilan teng uzunlikka keltiramiz (max 256 byte).
    const PAD = 256;
    const a = Buffer.alloc(PAD);
    const b = Buffer.alloc(PAD);
    Buffer.from(incoming).copy(a);
    Buffer.from(expected).copy(b);

    if (!timingSafeEqual(a, b)) {
      throw new Error('Invalid secret');
    }
  }

  private validateIp(ip: string): void {
    const raw = process.env.HIKVISION_ALLOWED_IPS;
    if (!raw || raw.trim() === '') return; // Whitelist sozlanmagan — o'tkazib yubor

    const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
    // NestJS @Ip() ba'zida "::ffff:x.x.x.x" IPv4-mapped IPv6 formatida kelishi mumkin
    const normalized = ip.replace(/^::ffff:/, '');
    if (!allowed.includes(normalized) && !allowed.includes(ip)) {
      throw new Error(`IP not whitelisted: ${ip}`);
    }
  }

  private parseEventLog(body: any, deviceIp: string): HikvisionEventDto {
    // body.event_log — multer orqali kelganda string yoki allaqachon object bo'lishi mumkin
    let log = body?.event_log;
    if (typeof log === 'string') {
      try {
        log = JSON.parse(log);
      } catch {
        throw new Error('event_log JSON parse xatosi');
      }
    }
    if (!log) throw new Error('event_log maydoni topilmadi');

    const ace = log.AccessControllerEvent;
    if (!ace) throw new Error('AccessControllerEvent topilmadi');

    const rawStatus: string = ace.attendanceStatus;
    if (rawStatus !== 'checkIn' && rawStatus !== 'checkOut') {
      throw new Error(
        `Noto'g'ri attendanceStatus: ${rawStatus}. Faqat checkIn/checkOut qabul qilinadi.`,
      );
    }

    const employeeNoStr: string = String(ace.employeeNoString ?? '').trim();
    if (!employeeNoStr) {
      throw new Error('employeeNoString bo\'sh');
    }

    // Ayrim Hikvision firmware'lari lokal vaqtni UTC offsetsiz yuboradi.
    // Bunday qiymat Node serverining TZ'iga bog'lanib qolmasligi uchun uni
    // klinika vaqti (Asia/Tashkent, UTC+5) deb aniq belgilaymiz.
    const rawDateTime = String(log.dateTime ?? log.DateTime ?? '').trim();
    const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(rawDateTime);
    const normalizedDateTime = hasTimeZone ? rawDateTime : `${rawDateTime}+05:00`;
    const eventAt = new Date(normalizedDateTime);
    if (isNaN(eventAt.getTime())) {
      throw new Error(`Noto'g'ri dateTime: ${log.dateTime}`);
    }

    // Qurilma IP — event_log.ipAddress ustun, yo'q bo'lsa request IP
    const resolvedDeviceIp: string = log.ipAddress ?? deviceIp;

    return { deviceIp: resolvedDeviceIp, eventAt, rawStatus, employeeNoStr };
  }
}
