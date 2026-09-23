-- Add vector-indexing bookkeeping while keeping PostgreSQL as the metadata source of truth.
ALTER TABLE "DocumentVersion"
  ADD COLUMN "embeddingModel" TEXT,
  ADD COLUMN "indexedAt" TIMESTAMP(3),
  ADD COLUMN "indexError" TEXT;

ALTER TABLE "DocumentChunk"
  ADD COLUMN "vectorId" TEXT,
  ADD COLUMN "embeddingModel" TEXT,
  ADD COLUMN "indexedAt" TIMESTAMP(3);

CREATE INDEX "DocumentVersion_indexedAt_idx" ON "DocumentVersion"("indexedAt");
CREATE INDEX "DocumentChunk_vectorId_idx" ON "DocumentChunk"("vectorId");
