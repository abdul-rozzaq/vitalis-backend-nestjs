-- CreateTable
CREATE TABLE "patient_otp_codes" (
    "id" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_otp_codes_phone_idx" ON "patient_otp_codes"("phone");
