CREATE TYPE "VideoProjectStatus" AS ENUM ('DRAFT', 'PLANNING', 'GENERATING_ASSETS', 'READY_TO_EDIT', 'RENDERING', 'COMPLETED', 'FAILED');
CREATE TYPE "VideoAssetType" AS ENUM ('GENERATED_IMAGE', 'UPLOADED_IMAGE', 'UPLOADED_VIDEO');
CREATE TYPE "VoiceProfileStatus" AS ENUM ('CREATING', 'READY', 'FAILED');

CREATE TABLE "VideoProject" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "voiceProfileId" TEXT,
    "title" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "channel" TEXT,
    "ratio" TEXT NOT NULL DEFAULT '9:16',
    "status" "VideoProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "settings" JSONB NOT NULL,
    "durationMs" INTEGER,
    "outputStorageKey" TEXT,
    "thumbnailStorageKey" TEXT,
    "outputMimeType" TEXT,
    "musicStorageKey" TEXT,
    "musicMimeType" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoScene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "narration" TEXT NOT NULL,
    "visualPrompt" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 5000,
    "transition" TEXT NOT NULL DEFAULT 'fade',
    "assetType" "VideoAssetType" NOT NULL DEFAULT 'GENERATED_IMAGE',
    "visualStorageKey" TEXT,
    "visualMimeType" TEXT,
    "narrationStorageKey" TEXT,
    "narrationMimeType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VideoScene_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'vi',
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "providerVoiceId" TEXT,
    "status" "VoiceProfileStatus" NOT NULL DEFAULT 'CREATING',
    "consentStorageKey" TEXT,
    "sampleStorageKey" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VideoProject_workspaceId_createdAt_idx" ON "VideoProject"("workspaceId", "createdAt");
CREATE INDEX "VideoProject_workspaceId_status_idx" ON "VideoProject"("workspaceId", "status");
CREATE UNIQUE INDEX "VideoScene_projectId_position_key" ON "VideoScene"("projectId", "position");
CREATE INDEX "VideoScene_projectId_position_idx" ON "VideoScene"("projectId", "position");
CREATE INDEX "VoiceProfile_workspaceId_status_idx" ON "VoiceProfile"("workspaceId", "status");

ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_voiceProfileId_fkey" FOREIGN KEY ("voiceProfileId") REFERENCES "VoiceProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoScene" ADD CONSTRAINT "VideoScene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
