import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role-name.enum';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import {
  AdjustAttendanceRecordDto,
  AttendanceEventsQueryDto,
  AttendanceRecordsQueryDto,
  LinkEmployeeDto,
  PatchAttendanceRecordDto,
  ResolveToShiftDto,
} from './attendance.dto';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  /**
   * Admin / Direktor: barcha xodimlar davomati ro'yxati.
   * Filtrlar: date (YYYY-MM-DD), from/to, userId, shiftId, status.
   */
  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Get('records')
  listRecords(@Query() query: AttendanceRecordsQueryDto) {
    return this.service.listRecords(query);
  }

  /**
   * Admin / Direktor: bir davomat yozuvi — bog'liq event'lar bilan.
   */
  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Get('records/:id')
  getRecord(@Param('id') id: string) {
    return this.service.getRecord(id);
  }

  /**
   * Admin: davomat yozuviga izoh yozish (manual tuzatish uchun).
   */
  @Roles(RoleName.ADMIN)
  @Patch('records/:id')
  patchRecord(
    @Param('id') id: string,
    @Body() dto: PatchAttendanceRecordDto,
  ) {
    return this.service.patchRecord(id, dto);
  }

  /**
   * Admin: xom event log (debug / audit).
   * Filtrlar: status, from, to.
   */
  @Roles(RoleName.ADMIN)
  @Get('events')
  listEvents(@Query() query: AttendanceEventsQueryDto) {
    return this.service.listEvents(query);
  }

  // ── Istisnolar navbati ──────────────────────────────────────────────────────

  /**
   * Admin / Direktor: hal qilinmagan skanlar va to'liqsiz yozuvlar.
   * Ilgari bular faqat log'ga tushib, hech kimga ko'rinmasdi.
   */
  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Get('unresolved')
  listUnresolved() {
    return this.service.listUnresolved();
  }

  /**
   * Admin: terminal ID ni xodimga bog'laydi va shu ID bilan kelgan barcha
   * hal qilinmagan skanlarni qayta ishlaydi.
   */
  @Roles(RoleName.ADMIN)
  @Post('events/:id/link-user')
  linkEmployee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkEmployeeDto,
  ) {
    return this.service.linkEmployeeNo(id, dto.userId);
  }

  /**
   * Admin: `NO_SHIFT` skanini smenaga bog'laydi (kerak bo'lsa xodimni
   * smenaga biriktirib).
   */
  @Roles(RoleName.ADMIN)
  @Post('events/:id/assign-shift')
  resolveToShift(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveToShiftDto,
  ) {
    return this.service.resolveEventToShift(id, dto.shiftId);
  }

  /**
   * Admin: qo'lda vaqt tuzatish. Xom skan o'zgarmaydi — tuzatish alohida
   * audit yozuvi sifatida saqlanadi.
   */
  @Roles(RoleName.ADMIN)
  @Post('records/:id/adjust')
  adjustRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustAttendanceRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.adjustRecord(id, dto, user.userId);
  }

  /**
   * Har bir xodim o'z davomati tarixini ko'rishi mumkin.
   */
  @Get('my')
  getMyRecords(@CurrentUser() user: JwtPayload) {
    return this.service.getMyRecords(user.userId);
  }
}
