import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

import { PrismaModule } from "./prisma/prisma.module";
import { GuardsModule } from "./common/guards/guards.module";
import { AppController } from "./app.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { RoomsModule } from "./modules/rooms/rooms.module";
import { AssignmentsModule } from "./modules/assignments/assignments.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { RolesModule } from "./modules/roles/roles.module";
import { PermissionsModule } from "./modules/permissions/permissions.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { RegionsModule } from "./modules/regions/regions.module";
import { DistrictsModule } from "./modules/districts/districts.module";
import { StatsModule } from "./modules/stats/stats.module";
import { MedicinesModule } from "./modules/medicines/medicines.module";
import { PrescriptionsModule } from "./modules/prescriptions/prescriptions.module";

import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionGuard } from "./common/guards/permission.guard";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { RequestLoggerMiddleware } from "./common/middleware/request-logger.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || "fallback_secret",
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
      }),
      global: true,
    }),
    PrismaModule,
    // GuardsModule is @Global() so PermissionGuard is available everywhere
    GuardsModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "uploads"),
      serveRoot: "/uploads",
      serveStaticOptions: { index: false },
    }),
    AuthModule,
    UsersModule,
    PatientsModule,
    DepartmentsModule,
    RoomsModule,
    AssignmentsModule,
    PaymentsModule,
    AppointmentsModule,
    RolesModule,
    PermissionsModule,
    UploadsModule,
    RegionsModule,
    DistrictsModule,
    StatsModule,
    MedicinesModule,
    PrescriptionsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // useExisting references the PermissionGuard singleton from GuardsModule
    // so PermissionsService gets the exact same instance (for cache invalidation)
    { provide: APP_GUARD, useExisting: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
