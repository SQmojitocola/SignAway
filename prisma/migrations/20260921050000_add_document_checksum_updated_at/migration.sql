-- Add fields used for document integrity tracking and update timestamps.
ALTER TABLE "documents"
ADD COLUMN "checksum" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
