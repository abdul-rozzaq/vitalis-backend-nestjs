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
import { LaboratoriesModule } from "./modules/laboratories/laboratories.module";
import { LaboratoryAssignmentsModule } from "./modules/laboratory-assignments/laboratory-assignments.module";
import { MedicalCardsModule } from "./modules/medical-cards/medical-cards.module";
import { MedicinesModule } from "./modules/medicines/medicines.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { PaymentsModule } from "./modules/payments/payments.module";
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
    UploadsModule,
    RegionsModule,
    DistrictsModule,
    StatsModule,
    MedicinesModule,
    PrescriptionsModule,
    MedicalCardsModule,
    CasesModule,
    LabOrdersModule,
    LaboratoriesModule,
    LaboratoryAssignmentsModule,
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
