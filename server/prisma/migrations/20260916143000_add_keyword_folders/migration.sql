-- CreateTable
CREATE TABLE "KeywordFolder" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordFolderItem" (
    "folderId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordFolderItem_pkey" PRIMARY KEY ("folderId", "keywordId")
);

-- CreateIndex
CREATE UNIQUE INDEX "KeywordFolder_workspaceId_name_key" ON "KeywordFolder"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "KeywordFolder_workspaceId_createdAt_idx" ON "KeywordFolder"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "KeywordFolderItem_keywordId_savedAt_idx" ON "KeywordFolderItem"("keywordId", "savedAt");

-- AddForeignKey
ALTER TABLE "KeywordFolder" ADD CONSTRAINT "KeywordFolder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordFolder" ADD CONSTRAINT "KeywordFolder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordFolderItem" ADD CONSTRAINT "KeywordFolderItem_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "KeywordFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordFolderItem" ADD CONSTRAINT "KeywordFolderItem_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
