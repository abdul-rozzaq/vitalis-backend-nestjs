import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { AppException } from "../../common/exceptions/app.exception";
import { PatientJwtPayload, PatientPreAuthJwtPayload } from "../../common/types/patient-jwt-payload.type";
import { PrismaService } from "../../prisma/prisma.service";
import { SmsService } from "./sms.service";

const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_WINDOW = 3;
const REQUEST_WINDOW_MINUTES = 10;
const FINAL_TOKEN_TTL = "30d";
const PREAUTH_TOKEN_TTL = "5m";

const PATIENT_SELECT = { id: true, first_name: true, last_name: true, birth_date: true } as const;

@Injectable()
export class PatientAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sms: SmsService,
  ) {}

  async requestOtp(phone: string) {
    const patientExists = await this.prisma.patient.findFirst({
      where: { phone_number: phone, deletedAt: null },
      select: { id: true },
    });
    if (!patientExists) {
      throw new AppException("Bu raqam bilan bemor topilmadi. Klinikaga murojaat qiling.", 404);
    }

    const windowStart = new Date(Date.now() - REQUEST_WINDOW_MINUTES * 60_000);
    const recentRequests = await this.prisma.patientOtpCode.count({
      where: { phone, createdAt: { gte: windowStart } },
    });
    if (recentRequests >= MAX_REQUESTS_PER_WINDOW) {
      throw new AppException("Juda ko'p urinish. Birozdan so'ng qayta urining.", 429);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    await this.prisma.patientOtpCode.create({ data: { phone, codeHash, expiresAt } });
    await this.sms.send(phone, `Vitalis: tasdiqlash kodi ${code}. Hech kimga aytmang.`);

    return { message: "Tasdiqlash kodi yuborildi" };
  }

  async verifyOtp(phone: string, code: string) {
    const otp = await this.prisma.patientOtpCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) throw new AppException("Kod topilmadi. Qayta so'rang.", 400);
    if (otp.expiresAt < new Date()) throw new AppException("Kod eskirgan. Qayta so'rang.", 400);
    if (otp.attempts >= MAX_ATTEMPTS) throw new AppException("Urinishlar tugadi. Qayta so'rang.", 400);

    const isValid = await bcrypt.compare(code, otp.codeHash);
    if (!isValid) {
      await this.prisma.patientOtpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new AppException("Kod noto'g'ri.", 400);
    }

    await this.prisma.patientOtpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    const patients = await this.prisma.patient.findMany({
      where: { phone_number: phone, deletedAt: null },
      select: PATIENT_SELECT,
    });
    if (patients.length === 0) {
      throw new AppException("Bu raqam bilan bemor topilmadi. Klinikaga murojaat qiling.", 404);
    }

    if (patients.length === 1) {
      return this.issueFinalToken(patients[0].id, phone, patients[0]);
    }

    const preAuthToken = this.jwtService.sign({ type: "patient-preauth", phone } satisfies PatientPreAuthJwtPayload, { secret: process.env.PATIENT_JWT_SECRET, expiresIn: PREAUTH_TOKEN_TTL });
    return { preAuthToken, patients };
  }

  async selectPatient(preAuthToken: string, patientId: string) {
    let payload: PatientPreAuthJwtPayload;
    try {
      payload = this.jwtService.verify<PatientPreAuthJwtPayload>(preAuthToken, {
        secret: process.env.PATIENT_JWT_SECRET,
      });
    } catch {
      throw new AppException("Sessiya eskirgan. Qayta kiring.", 401);
    }
    if (payload.type !== "patient-preauth") {
      throw new AppException("Yaroqsiz token.", 401);
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, phone_number: payload.phone, deletedAt: null },
      select: PATIENT_SELECT,
    });
    if (!patient) throw new AppException("Bemor topilmadi.", 404);

    return this.issueFinalToken(patient.id, payload.phone, patient);
  }

  private issueFinalToken(patientId: string, phone: string, patient: { id: string; first_name: string; last_name: string; birth_date: Date }) {
    const accessToken = this.jwtService.sign({ type: "patient", patientId, phone } satisfies PatientJwtPayload, { secret: process.env.PATIENT_JWT_SECRET, expiresIn: FINAL_TOKEN_TTL });
    return { accessToken, patient };
  }
}
