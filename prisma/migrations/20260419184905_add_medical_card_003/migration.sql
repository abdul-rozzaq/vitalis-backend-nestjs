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

-- AddForeignKey
ALTER TABLE "medical_cards_003" ADD CONSTRAINT "medical_cards_003_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
