-- CreateEnum
CREATE TYPE "attendance_event_statuses" AS ENUM ('PENDING', 'MATCHED', 'UNKNOWN_EMPLOYEE', 'NO_SHIFT');

-- CreateEnum
CREATE TYPE "attendance_record_statuses" AS ENUM ('PRESENT', 'LATE', 'EARLY_LEAVE', 'LATE_AND_EARLY_LEAVE', 'ABSENT');

-- CreateEnum
CREATE TYPE "case_statuses" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "case_step_types" AS ENUM ('CHECKIN', 'CONSULTATION', 'LAB', 'PROCEDURE', 'REFERRAL', 'DISCHARGE', 'OPERATION', 'DIAGNOSTIC');

-- CreateEnum
CREATE TYPE "case_step_statuses" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "room_types" AS ENUM ('WARD', 'EXAMINATION', 'OPERATION');

-- CreateEnum
CREATE TYPE "diagnostic_order_statuses" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "diagnostic_item_statuses" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "balance_tx_types" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "balance_tx_sources" AS ENUM ('DEPOSIT', 'WARD_DAILY', 'APPOINTMENT', 'LAB_SERVICE', 'INVOICE_PAYMENT', 'REFUND', 'ADJUSTMENT', 'PROCEDURE_SERVICE');

-- CreateEnum
CREATE TYPE "bonus_tx_types" AS ENUM ('EARN', 'SPEND', 'EXPIRE');

-- CreateEnum
CREATE TYPE "bonus_tx_sources" AS ENUM ('REFERRAL', 'FIRST_VISIT', 'LOYALTY', 'PROMOTION', 'SERVICE_SPEND', 'ACCOMMODATION');

-- CreateEnum
CREATE TYPE "invoice_statuses" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "invoice_source_types" AS ENUM ('WARD', 'APPOINTMENT', 'LAB_ORDER', 'MANUAL', 'OPERATION', 'DIAGNOSTIC_ORDER', 'PROCEDURE_ORDER');

-- CreateEnum
CREATE TYPE "invoice_item_source_types" AS ENUM ('APPOINTMENT', 'LAB_SERVICE', 'WARD_DAILY', 'MANUAL', 'OPERATION', 'DIAGNOSTIC_SERVICE', 'PROCEDURE_SERVICE');

-- CreateEnum
CREATE TYPE "payment_methods" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "lab_order_statuses" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "lab_item_statuses" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "operation_statuses" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "surgeon_roles" AS ENUM ('LEAD', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "document_types" AS ENUM ('PASSPORT', 'BIRTH_CERTIFICATE', 'FOREIGN_PASSPORT', 'RESIDENCE_PERMIT');

-- CreateEnum
CREATE TYPE "blood_types" AS ENUM ('O_POSITIVE', 'O_NEGATIVE', 'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE');

-- CreateEnum
CREATE TYPE "meal_relations" AS ENUM ('BEFORE_MEAL', 'AFTER_MEAL', 'WITH_MEAL', 'AT_SPECIFIC_TIME');

-- CreateEnum
CREATE TYPE "procedure_order_statuses" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "patient_conditions" AS ENUM ('STABLE', 'IMPROVING', 'WORSENING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "shift_statuses" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "shift_staff_roles" AS ENUM ('DOCTOR', 'NURSE');

-- CreateEnum
CREATE TYPE "availability_types" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "time_off_statuses" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "user_roles" AS ENUM ('ADMIN', 'KASSIR', 'DOCTOR', 'HAMSHIRA', 'LABARANT', 'TEXNIK_HODIM', 'DIREKTOR', 'HISOBCHI', 'DIAGNOST');

-- CreateEnum
CREATE TYPE "ward_statuses" AS ENUM ('OCCUPIED', 'VACATED');

-- CreateEnum
CREATE TYPE "schedule_publish_statuses" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "conclusion" TEXT,
    "patientId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_files" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_events" (
    "id" TEXT NOT NULL,
    "deviceIp" VARCHAR(45) NOT NULL,
    "employeeNoStr" VARCHAR(50) NOT NULL,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "rawStatus" VARCHAR(20) NOT NULL,
    "picturePath" VARCHAR(500),
    "status" "attendance_event_statuses" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "attendance_record_statuses" NOT NULL DEFAULT 'PRESENT',
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_cases" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "case_statuses" NOT NULL DEFAULT 'ACTIVE',
    "chiefComplaint" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_steps" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "case_step_types" NOT NULL,
    "status" "case_step_statuses" NOT NULL DEFAULT 'PENDING',
    "assignmentId" TEXT,
    "appointmentId" TEXT,
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "patient_daily_price" DECIMAL(15,2),
    "companion_daily_price" DECIMAL(15,2),
    "parentId" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "floor" INTEGER,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "room_type" "room_types" NOT NULL,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "assignmentId" TEXT NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "roomId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_orders" (
    "id" TEXT NOT NULL,
    "status" "diagnostic_order_statuses" NOT NULL DEFAULT 'PENDING',
    "caseStepId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "diagnosticsId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostic_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_order_items" (
    "id" TEXT NOT NULL,
    "status" "diagnostic_item_statuses" NOT NULL DEFAULT 'PENDING',
    "diagnosticOrderId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostic_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_order_item_files" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diagnosticOrderItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_order_item_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostics" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_services" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "price" DOUBLE PRECISION,
    "diagnosticsId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostic_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diagnosticsId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_balances" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_transactions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "balance_tx_types" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "source" "balance_tx_sources" NOT NULL,
    "sourceId" TEXT,
    "paymentMethod" "payment_methods",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "balance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_bonus_balances" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_bonus_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_transactions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "bonus_tx_types" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "source" "bonus_tx_sources" NOT NULL,
    "sourceId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "bonus_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "invoice_statuses" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "paidCash" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paidBonus" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "note" TEXT,
    "sourceType" "invoice_source_types" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "totalPrice" DECIMAL(15,2) NOT NULL,
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "sourceType" "invoice_item_source_types" NOT NULL,
    "sourceId" TEXT,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "cashAmount" DECIMAL(15,2) NOT NULL,
    "bonusAmount" DECIMAL(15,2) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "regionId" TEXT NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laboratories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratory_services" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "price" DOUBLE PRECISION,
    "laboratoryId" TEXT NOT NULL,
    "defaultRows" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laboratory_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratory_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laboratory_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" TEXT NOT NULL,
    "status" "lab_order_statuses" NOT NULL DEFAULT 'PENDING',
    "caseStepId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "sampleTakenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_order_items" (
    "id" TEXT NOT NULL,
    "status" "lab_item_statuses" NOT NULL DEFAULT 'PENDING',
    "labOrderId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "performedById" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_result_tables" (
    "id" TEXT NOT NULL,
    "labOrderItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_result_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_result_rows" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "code" TEXT,
    "indicator" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "norm" TEXT,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_result_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_result_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "rows" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_result_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_order_item_files" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "labOrderItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_order_item_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_types" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "operation_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_type_items" (
    "id" TEXT NOT NULL,
    "operationTypeId" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_type_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" TEXT NOT NULL,
    "status" "operation_statuses" NOT NULL DEFAULT 'SCHEDULED',
    "patientId" TEXT NOT NULL,
    "operationTypeId" TEXT NOT NULL,
    "roomId" TEXT,
    "departmentId" TEXT,
    "caseStepId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "contractNumber" VARCHAR(64),
    "basePrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_surgeons" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "surgeonId" TEXT NOT NULL,
    "role" "surgeon_roles" NOT NULL DEFAULT 'ASSISTANT',

    CONSTRAINT "operation_surgeons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_items" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "operationTypeItemId" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_type_doctors" (
    "id" TEXT NOT NULL,
    "operationTypeId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_type_doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "first_name" VARCHAR(64) NOT NULL,
    "last_name" VARCHAR(64) NOT NULL,
    "phone_number" VARCHAR(15) NOT NULL,
    "gender" VARCHAR(10) NOT NULL,
    "birth_date" DATE NOT NULL,
    "address" VARCHAR(255),
    "blood_type" "blood_types" DEFAULT 'O_POSITIVE',
    "document_type" "document_types",
    "document_series" VARCHAR(10),
    "document_number" VARCHAR(20),
    "pinfl" VARCHAR(14),
    "districtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_cards_003" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionDate" DATE NOT NULL,
    "dischargeDate" DATE,
    "wardNumber" VARCHAR(20),
    "departmentName" VARCHAR(128),
    "doctorName" VARCHAR(128),
    "nurseName" VARCHAR(128),
    "complaints" TEXT,
    "anamnesis" TEXT,
    "lifeAnamnesis" TEXT,
    "diagnosisInitial" VARCHAR(500),
    "diagnosisFinal" VARCHAR(500),
    "treatment" TEXT,
    "dailyNotes" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_cards_003_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "caseStepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "dosage" VARCHAR(64) NOT NULL,
    "frequency" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "mealRelation" "meal_relations" NOT NULL,
    "specificTime" VARCHAR(5),
    "note" TEXT,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(15,2),
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_orders" (
    "id" TEXT NOT NULL,
    "status" "procedure_order_statuses" NOT NULL DEFAULT 'PENDING',
    "caseStepId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "doctorId" TEXT,
    "price" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "workScheduleId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "requiredDoctors" INTEGER NOT NULL DEFAULT 1,
    "requiredNurses" INTEGER NOT NULL DEFAULT 1,
    "note" VARCHAR(500),
    "status" "shift_statuses" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_requirements" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "requiredCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "shift_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_staff" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "shift_staff_roles" NOT NULL,

    CONSTRAINT "shift_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ward_rounds" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ward_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ward_round_patients" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "condition" "patient_conditions" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ward_round_patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_templates" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_template_requirements" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "requiredCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "shift_template_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_availabilities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "type" "availability_types" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_time_offs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "time_off_statuses" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_time_offs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employeeNo" VARCHAR(50),
    "first_name" VARCHAR(64) NOT NULL,
    "last_name" VARCHAR(64) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "password" TEXT NOT NULL,
    "birthday" DATE,
    "photo" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "user_roles" NOT NULL DEFAULT 'TEXNIK_HODIM',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wards" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedOut" TIMESTAMP(3),
    "actualOut" TIMESTAMP(3),
    "daysStayed" INTEGER DEFAULT 0,
    "companionsCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "status" "ward_statuses" NOT NULL DEFAULT 'OCCUPIED',
    "dailyRate" DECIMAL(15,2),
    "patient_price_per_day" DECIMAL(15,2),
    "companion_price_per_day" DECIMAL(15,2),
    "totalCharged" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "schedule_publish_statuses" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedule_versions" (
    "id" TEXT NOT NULL,
    "workScheduleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changeSummary" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_schedule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_events_userId_eventAt_idx" ON "attendance_events"("userId", "eventAt");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_events_deviceIp_employeeNoStr_eventAt_key" ON "attendance_events"("deviceIp", "employeeNoStr", "eventAt");

-- CreateIndex
CREATE INDEX "attendance_records_userId_shiftId_idx" ON "attendance_records"("userId", "shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_userId_shiftId_key" ON "attendance_records"("userId", "shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "case_steps_appointmentId_key" ON "case_steps"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_userId_departmentId_key" ON "assignments"("userId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_orders_caseStepId_key" ON "diagnostic_orders"("caseStepId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_assignments_userId_diagnosticsId_key" ON "diagnostic_assignments"("userId", "diagnosticsId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_balances_patientId_key" ON "patient_balances"("patientId");

-- CreateIndex
CREATE INDEX "balance_transactions_patientId_idx" ON "balance_transactions"("patientId");

-- CreateIndex
CREATE INDEX "balance_transactions_source_sourceId_idx" ON "balance_transactions"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_bonus_balances_patientId_key" ON "patient_bonus_balances"("patientId");

-- CreateIndex
CREATE INDEX "bonus_transactions_patientId_idx" ON "bonus_transactions"("patientId");

-- CreateIndex
CREATE INDEX "invoices_patientId_idx" ON "invoices"("patientId");

-- CreateIndex
CREATE INDEX "invoices_sourceType_sourceId_idx" ON "invoices"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_regionId_key" ON "districts"("name", "regionId");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_assignments_userId_laboratoryId_key" ON "laboratory_assignments"("userId", "laboratoryId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_result_tables_labOrderItemId_key" ON "lab_result_tables"("labOrderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "operations_caseStepId_key" ON "operations"("caseStepId");

-- CreateIndex
CREATE UNIQUE INDEX "operation_surgeons_operationId_surgeonId_key" ON "operation_surgeons"("operationId", "surgeonId");

-- CreateIndex
CREATE UNIQUE INDEX "operation_type_doctors_operationTypeId_doctorId_key" ON "operation_type_doctors"("operationTypeId", "doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_pinfl_key" ON "patients"("pinfl");

-- CreateIndex
CREATE INDEX "patients_deletedAt_idx" ON "patients"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_name_key" ON "medicines"("name");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_appointmentId_key" ON "prescriptions"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_caseStepId_key" ON "prescriptions"("caseStepId");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_orders_caseStepId_key" ON "procedure_orders"("caseStepId");

-- CreateIndex
CREATE INDEX "shifts_departmentId_startAt_endAt_idx" ON "shifts"("departmentId", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "shift_requirements_shiftId_roleId_key" ON "shift_requirements"("shiftId", "roleId");

-- CreateIndex
CREATE INDEX "shift_assignments_userId_idx" ON "shift_assignments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignments_shiftId_userId_key" ON "shift_assignments"("shiftId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_staff_shiftId_userId_key" ON "shift_staff"("shiftId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_template_requirements_templateId_roleId_key" ON "shift_template_requirements"("templateId", "roleId");

-- CreateIndex
CREATE INDEX "staff_availabilities_userId_dayOfWeek_idx" ON "staff_availabilities"("userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "staff_time_offs_userId_startDate_endDate_idx" ON "staff_time_offs"("userId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "staff_roles_code_key" ON "staff_roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeNo_key" ON "users"("employeeNo");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "work_schedule_versions_workScheduleId_version_key" ON "work_schedule_versions"("workScheduleId", "version");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_files" ADD CONSTRAINT "appointment_files_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_cases" ADD CONSTRAINT "patient_cases_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_steps" ADD CONSTRAINT "case_steps_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_steps" ADD CONSTRAINT "case_steps_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_steps" ADD CONSTRAINT "case_steps_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "patient_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_orders" ADD CONSTRAINT "diagnostic_orders_caseStepId_fkey" FOREIGN KEY ("caseStepId") REFERENCES "case_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_orders" ADD CONSTRAINT "diagnostic_orders_diagnosticsId_fkey" FOREIGN KEY ("diagnosticsId") REFERENCES "diagnostics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_orders" ADD CONSTRAINT "diagnostic_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_order_items" ADD CONSTRAINT "diagnostic_order_items_diagnosticOrderId_fkey" FOREIGN KEY ("diagnosticOrderId") REFERENCES "diagnostic_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_order_items" ADD CONSTRAINT "diagnostic_order_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "diagnostic_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_order_item_files" ADD CONSTRAINT "diagnostic_order_item_files_diagnosticOrderItemId_fkey" FOREIGN KEY ("diagnosticOrderItemId") REFERENCES "diagnostic_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_services" ADD CONSTRAINT "diagnostic_services_diagnosticsId_fkey" FOREIGN KEY ("diagnosticsId") REFERENCES "diagnostics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_assignments" ADD CONSTRAINT "diagnostic_assignments_diagnosticsId_fkey" FOREIGN KEY ("diagnosticsId") REFERENCES "diagnostics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_assignments" ADD CONSTRAINT "diagnostic_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_balances" ADD CONSTRAINT "patient_balances_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_balances"("patientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_bonus_balances" ADD CONSTRAINT "patient_bonus_balances_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_transactions" ADD CONSTRAINT "bonus_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_transactions" ADD CONSTRAINT "bonus_transactions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_bonus_balances"("patientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_services" ADD CONSTRAINT "laboratory_services_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_assignments" ADD CONSTRAINT "laboratory_assignments_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_assignments" ADD CONSTRAINT "laboratory_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_caseStepId_fkey" FOREIGN KEY ("caseStepId") REFERENCES "case_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "laboratory_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_result_tables" ADD CONSTRAINT "lab_result_tables_labOrderItemId_fkey" FOREIGN KEY ("labOrderItemId") REFERENCES "lab_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_result_rows" ADD CONSTRAINT "lab_result_rows_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "lab_result_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_item_files" ADD CONSTRAINT "lab_order_item_files_labOrderItemId_fkey" FOREIGN KEY ("labOrderItemId") REFERENCES "lab_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_types" ADD CONSTRAINT "operation_types_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_type_items" ADD CONSTRAINT "operation_type_items_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "operation_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_caseStepId_fkey" FOREIGN KEY ("caseStepId") REFERENCES "case_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "operation_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_surgeons" ADD CONSTRAINT "operation_surgeons_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_surgeons" ADD CONSTRAINT "operation_surgeons_surgeonId_fkey" FOREIGN KEY ("surgeonId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_items" ADD CONSTRAINT "operation_items_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_items" ADD CONSTRAINT "operation_items_operationTypeItemId_fkey" FOREIGN KEY ("operationTypeItemId") REFERENCES "operation_type_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_type_doctors" ADD CONSTRAINT "operation_type_doctors_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "operation_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_type_doctors" ADD CONSTRAINT "operation_type_doctors_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_cards_003" ADD CONSTRAINT "medical_cards_003_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_caseStepId_fkey" FOREIGN KEY ("caseStepId") REFERENCES "case_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_orders" ADD CONSTRAINT "procedure_orders_caseStepId_fkey" FOREIGN KEY ("caseStepId") REFERENCES "case_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_orders" ADD CONSTRAINT "procedure_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_orders" ADD CONSTRAINT "procedure_orders_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_orders" ADD CONSTRAINT "procedure_orders_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_workScheduleId_fkey" FOREIGN KEY ("workScheduleId") REFERENCES "work_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_requirements" ADD CONSTRAINT "shift_requirements_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_requirements" ADD CONSTRAINT "shift_requirements_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "staff_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "staff_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_staff" ADD CONSTRAINT "shift_staff_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_staff" ADD CONSTRAINT "shift_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_rounds" ADD CONSTRAINT "ward_rounds_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_round_patients" ADD CONSTRAINT "ward_round_patients_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_round_patients" ADD CONSTRAINT "ward_round_patients_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ward_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_template_requirements" ADD CONSTRAINT "shift_template_requirements_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "shift_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_template_requirements" ADD CONSTRAINT "shift_template_requirements_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "staff_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_availabilities" ADD CONSTRAINT "staff_availabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_time_offs" ADD CONSTRAINT "staff_time_offs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedule_versions" ADD CONSTRAINT "work_schedule_versions_workScheduleId_fkey" FOREIGN KEY ("workScheduleId") REFERENCES "work_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedule_versions" ADD CONSTRAINT "work_schedule_versions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
