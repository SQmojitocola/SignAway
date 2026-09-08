ALTER TYPE "RecipientStatus" ADD VALUE 'PENDING';

ALTER TABLE "documents"
ADD COLUMN "sequential" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "document_recipients"
ADD COLUMN "signing_order" INTEGER;