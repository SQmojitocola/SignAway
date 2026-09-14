/*
  Warnings:

  - You are about to drop the column `sender_id` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - Added the required column `role` to the `document_recipients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_path` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STAFF', 'ATASAN');

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_sender_id_fkey";

-- AlterTable
ALTER TABLE "document_recipients" ADD COLUMN     "role" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "sender_id",
ADD COLUMN     "sender_path" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "created_at",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STAFF',
ADD COLUMN     "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_sender_path_fkey" FOREIGN KEY ("sender_path") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
