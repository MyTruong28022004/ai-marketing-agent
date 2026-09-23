-- CreateEnum
CREATE TYPE "ContentPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentPostStatus" AS ENUM ('PLANNED', 'WRITTEN', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContentPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "ContentPillar" AS ENUM ('BRAND', 'PRODUCT_SERVICE', 'EDUCATION', 'PROBLEM_SOLUTION', 'SALES', 'CUSTOMER_PROOF', 'INTERNAL_CULTURE', 'FAQ', 'CUSTOMER_SUPPORT', 'RECRUITING', 'PARTNERS_ACHIEVEMENTS');

-- CreateEnum
CREATE TYPE "ContentFormatType" AS ENUM ('REEL', 'CAROUSEL', 'INFOGRAPHIC', 'QUOTE', 'STORY', 'CHECKLIST');

-- CreateTable
CREATE TABLE "ContentPlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "postCount" INTEGER NOT NULL,
    "status" "ContentPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPost" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "platform" "ContentPlatform" NOT NULL,
    "pillar" "ContentPillar" NOT NULL,
    "format" "ContentFormatType" NOT NULL,
    "contentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "highlight" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "searchVolume" INTEGER,
    "volumePeriod" TEXT,
    "refUrl" TEXT,
    "status" "ContentPostStatus" NOT NULL DEFAULT 'PLANNED',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentPlan_workspaceId_startDate_endDate_idx" ON "ContentPlan"("workspaceId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ContentPost_planId_scheduledDate_idx" ON "ContentPost"("planId", "scheduledDate");

-- CreateIndex
CREATE INDEX "ContentPost_scheduledDate_status_idx" ON "ContentPost"("scheduledDate", "status");

-- AddForeignKey
ALTER TABLE "ContentPlan" ADD CONSTRAINT "ContentPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPlan" ADD CONSTRAINT "ContentPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
