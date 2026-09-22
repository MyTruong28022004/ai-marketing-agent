CREATE TABLE "FacebookAppConfig" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "encryptedAppSecret" TEXT NOT NULL,
    "loginConfigId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacebookAppConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacebookAppConfig_workspaceId_key" ON "FacebookAppConfig"("workspaceId");

ALTER TABLE "FacebookAppConfig"
ADD CONSTRAINT "FacebookAppConfig_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
