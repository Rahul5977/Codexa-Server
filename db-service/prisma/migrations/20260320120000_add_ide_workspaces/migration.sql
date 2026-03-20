-- CreateTable
CREATE TABLE "ide_workspaces" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tree" JSONB NOT NULL,
    "fileContents" JSONB NOT NULL,
    "selectedNodeId" TEXT,
    "selectedLanguageId" TEXT,
    "stdin" TEXT,
    "stdinMode" TEXT,
    "selectedStdinFileId" TEXT,
    "expandedFolderIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ide_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ide_workspaces_userId_key" ON "ide_workspaces"("userId");

-- CreateIndex
CREATE INDEX "ide_workspaces_userId_idx" ON "ide_workspaces"("userId");

-- AddForeignKey
ALTER TABLE "ide_workspaces" ADD CONSTRAINT "ide_workspaces_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
