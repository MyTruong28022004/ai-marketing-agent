ALTER TYPE "ContentPlanStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "ContentPlanStatus" ADD VALUE 'APPROVED';
ALTER TYPE "ContentPlanStatus" ADD VALUE 'RETURNED';

ALTER TABLE "ContentPlan"
ADD COLUMN "returnReason" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3);

ALTER TABLE "ContentPost"
ADD COLUMN "contentBody" TEXT,
ADD COLUMN "publishedUrl" TEXT,
ADD COLUMN "publishError" TEXT;
