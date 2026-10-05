/*
  Warnings:

  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STAFF', 'ATASAN');

-- AlterTable
ALTER TABLE "document_recipients" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'penandatangan';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "created_at",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STAFF',
ADD COLUMN     "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
