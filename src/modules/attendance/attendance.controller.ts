import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role-name.enum';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import {
  AttendanceEventsQueryDto,
  AttendanceRecordsQueryDto,
  PatchAttendanceRecordDto,
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

  /**
   * Har bir xodim o'z davomati tarixini ko'rishi mumkin.
   */
  @Get('my')
  getMyRecords(@CurrentUser() user: JwtPayload) {
    return this.service.getMyRecords(user.userId);
  }
}
