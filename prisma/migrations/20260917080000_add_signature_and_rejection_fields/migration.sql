-- AlterTable
ALTER TABLE "users" ADD COLUMN "signature_specimen" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "reject_reason" TEXT;

-- AlterTable
ALTER TABLE "document_recipients" ADD COLUMN "reject_reason" TEXT;
