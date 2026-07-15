import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

import { AppController } from "./app.controller";
import { GuardsModule } from "./common/guards/guards.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AssignmentsModule } from "./modules/assignments/assignments.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CasesModule } from "./modules/cases/cases.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { DistrictsModule } from "./modules/districts/districts.module";
import { LabOrdersModule } from "./modules/lab-orders/lab-orders.module";
import { LabResultTemplatesModule } from "./modules/lab-result-templates/lab-result-templates.module";
import { LaboratoriesModule } from "./modules/laboratories/laboratories.module";
import { LaboratoryAssignmentsModule } from "./modules/laboratory-assignments/laboratory-assignments.module";
import { MedicalCardsModule } from "./modules/medical-cards/medical-cards.module";
import { MedicinesModule } from "./modules/medicines/medicines.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { PrescriptionsModule } from "./modules/prescriptions/prescriptions.module";
import { RegionsModule } from "./modules/regions/regions.module";
import { RoomsModule } from "./modules/rooms/rooms.module";
import { StatsModule } from "./modules/stats/stats.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { RequestLoggerMiddleware } from "./common/middleware/request-logger.middleware";
import { WardsModule } from './modules/wards/wards.module';
import { BalanceModule } from './modules/balance/balance.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { WardBillingModule } from './modules/ward-billing/ward-billing.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { WardRoundsModule } from './modules/ward-rounds/ward-rounds.module';
import { OperationsModule } from "./modules/operations/operations.module";
import { OperationTypesModule } from "./modules/operation-types/operation-types.module";
import { DiagnosticsModule } from "./modules/diagnostics/diagnostics.module";
import { DiagnosticOrdersModule } from "./modules/diagnostic-orders/diagnostic-orders.module";
import { DiagnosticAssignmentsModule } from "./modules/diagnostic-assignments/diagnostic-assignments.module";
import { ScheduleModule } from "@nestjs/schedule";
import { SchedulingModule } from "./modules/scheduling/scheduling.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || "fallback_secret",
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
      }),
      global: true,
    }),
    PrismaModule,
    GuardsModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "uploads"),
      serveRoot: "/uploads",
      serveStaticOptions: { index: false }
    }),
    AuthModule,
    UsersModule,
    PatientsModule,
    DepartmentsModule,
    RoomsModule,
    AssignmentsModule,
    AppointmentsModule,
    UploadsModule,
    RegionsModule,
    DistrictsModule,
    StatsModule,
    MedicinesModule,
    PrescriptionsModule,
    MedicalCardsModule,
    CasesModule,
    LabOrdersModule,
    LabResultTemplatesModule,
    LaboratoriesModule,
    LaboratoryAssignmentsModule,
    WardsModule,
    BalanceModule,
    InvoiceModule,
    WardBillingModule,
    ShiftsModule,
    WardRoundsModule,
    OperationTypesModule,
    OperationsModule,
    DiagnosticsModule,
    DiagnosticOrdersModule,
    DiagnosticAssignmentsModule,
    SchedulingModule,
    AttendanceModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
