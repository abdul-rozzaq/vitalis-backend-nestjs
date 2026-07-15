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
  UnauthorizedException,
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
  @UseInterceptors(AnyFilesInterceptor(attendanceMulterOptions))
  async receiveWebhook(
    @Query('secret') secret: string,
    @Ip() clientIp: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    // 1. Secret tekshiruvi — timing-safe comparison
    this.validateSecret(secret);

    // 2. IP whitelist tekshiruvi (agar sozlangan bo'lsa)
    this.validateIp(clientIp);

    // 3. event_log parse
    const dto = this.parseEventLog(body, clientIp);

    // 4. Rasm yo'lini topish (Picture.jpg yoki birinchi fayl)
    const pictureFile = (files ?? []).find(
      (f) => f.fieldname === 'Picture' || f.mimetype.startsWith('image/'),
    );
    const picturePath = pictureFile
      ? `/uploads/attendance/${pictureFile.filename}`
      : null;

    // 5. Service'ga topshirish
    await this.service.processEvent(dto, picturePath);

    return { ok: true };
  }

  // ─── Validation helpers ─────────────────────────────────────────────────────

  private validateSecret(incoming: string | undefined): void {
    const expected = process.env.ATTENDANCE_WEBHOOK_SECRET ?? '';
    if (!incoming) {
      throw new UnauthorizedException('Missing secret query param');
    }

    // timingSafeEqual ikki Buffer teng uzunlikda bo'lishini talab qiladi.
    // Padding bilan teng uzunlikka keltiramiz (max 256 byte).
    const PAD = 256;
    const a = Buffer.alloc(PAD);
    const b = Buffer.alloc(PAD);
    Buffer.from(incoming).copy(a);
    Buffer.from(expected).copy(b);

    if (!timingSafeEqual(a, b)) {
      this.logger.warn(`Webhook rejected: invalid secret from ip=${process.env.HIKVISION_ALLOWED_IPS}`);
      throw new UnauthorizedException('Invalid secret');
    }
  }

  private validateIp(ip: string): void {
    const raw = process.env.HIKVISION_ALLOWED_IPS;
    if (!raw || raw.trim() === '') return; // Whitelist sozlanmagan — o'tkazib yubor

    const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
    // NestJS @Ip() ba'zida "::ffff:x.x.x.x" IPv4-mapped IPv6 formatida kelishi mumkin
    const normalized = ip.replace(/^::ffff:/, '');
    if (!allowed.includes(normalized) && !allowed.includes(ip)) {
      this.logger.warn(`Webhook rejected: IP not whitelisted: ${ip}`);
      throw new ForbiddenException(`IP not whitelisted: ${ip}`);
    }
  }

  private parseEventLog(body: any, deviceIp: string): HikvisionEventDto {
    // body.event_log — multer orqali kelganda string yoki allaqachon object bo'lishi mumkin
    let log = body?.event_log;
    if (typeof log === 'string') {
      try {
        log = JSON.parse(log);
      } catch {
        throw new BadRequestException('event_log JSON parse xatosi');
      }
    }
    if (!log) throw new BadRequestException('event_log maydoni topilmadi');

    const ace = log.AccessControllerEvent;
    if (!ace) throw new BadRequestException('AccessControllerEvent topilmadi');

    const rawStatus: string = ace.attendanceStatus;
    if (rawStatus !== 'checkIn' && rawStatus !== 'checkOut') {
      throw new BadRequestException(
        `Noto'g'ri attendanceStatus: ${rawStatus}. Faqat checkIn/checkOut qabul qilinadi.`,
      );
    }

    const employeeNoStr: string = String(ace.employeeNoString ?? '').trim();
    if (!employeeNoStr) {
      throw new BadRequestException('employeeNoString bo\'sh');
    }

    // Qurilmadan kelgan ISO timestamp (+05:00 bilan)
    const eventAt = new Date(log.dateTime ?? log.DateTime);
    if (isNaN(eventAt.getTime())) {
      throw new BadRequestException(`Noto'g'ri dateTime: ${log.dateTime}`);
    }

    // Qurilma IP — event_log.ipAddress ustun, yo'q bo'lsa request IP
    const resolvedDeviceIp: string = log.ipAddress ?? deviceIp;

    return { deviceIp: resolvedDeviceIp, eventAt, rawStatus, employeeNoStr };
  }
}
