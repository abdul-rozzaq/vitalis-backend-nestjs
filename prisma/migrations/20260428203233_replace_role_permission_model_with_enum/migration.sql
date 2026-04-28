/*
  Warnings:

  - You are about to drop the column `is_super_user` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "user_roles" AS ENUM ('ADMIN', 'KASSIR', 'DOCTOR', 'HAMSHIRA', 'LABARANT', 'TEXNIK_HODIM', 'DIREKTOR', 'HISOBCHI');

-- DropForeignKey
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_roleId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_roleId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_super_user",
DROP COLUMN "roleId",
ADD COLUMN     "role" "user_roles" NOT NULL DEFAULT 'TEXNIK_HODIM';

-- DropTable
DROP TABLE "permissions";

-- DropTable
DROP TABLE "roles";
