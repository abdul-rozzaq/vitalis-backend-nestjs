import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { WorkingHoursService } from "./working-hours.service";

@Controller("/working-hours")
export class WorkingHoursController {
  constructor(private readonly service: WorkingHoursService) {}

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Get("/")
  findLogs(
    @Query("userId") userId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.service.findLogs(userId, from, to);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Get("/summary")
  getSummary(@Query("userId") userId: string, @Query("period") period: "week" | "month" = "week") {
    return this.service.getSummary(userId, period);
  }

  @Roles(RoleName.DOCTOR, RoleName.HAMSHIRA)
  @Get("/my")
  getMyLogs(@CurrentUser() user: JwtPayload) {
    return this.service.getMyLogs(user.userId);
  }
}
