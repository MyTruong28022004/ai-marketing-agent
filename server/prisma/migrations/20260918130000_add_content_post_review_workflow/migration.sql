CREATE TYPE "ContentPostReviewStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'RETURNED');

ALTER TABLE "ContentPost"
ADD COLUMN "reviewStatus" "ContentPostReviewStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "reviewReason" TEXT,
ADD COLUMN "reviewSubmittedAt" TIMESTAMP(3),
ADD COLUMN "reviewApprovedAt" TIMESTAMP(3);

UPDATE "ContentPost" AS post
SET "reviewStatus" = CASE plan."status"::text
  WHEN 'PENDING_APPROVAL' THEN 'PENDING_APPROVAL'::"ContentPostReviewStatus"
  WHEN 'APPROVED' THEN 'APPROVED'::"ContentPostReviewStatus"
  WHEN 'ACTIVE' THEN 'APPROVED'::"ContentPostReviewStatus"
  WHEN 'RETURNED' THEN 'RETURNED'::"ContentPostReviewStatus"
  ELSE 'DRAFT'::"ContentPostReviewStatus"
END
FROM "ContentPlan" AS plan
WHERE post."planId" = plan."id";
