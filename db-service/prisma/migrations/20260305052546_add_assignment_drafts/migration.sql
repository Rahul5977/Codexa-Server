-- CreateTable
CREATE TABLE "assignment_drafts" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "languageId" INTEGER NOT NULL DEFAULT 71,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignment_drafts_assignmentId_idx" ON "assignment_drafts"("assignmentId");

-- CreateIndex
CREATE INDEX "assignment_drafts_studentId_idx" ON "assignment_drafts"("studentId");

-- CreateIndex
CREATE INDEX "assignment_drafts_problemId_idx" ON "assignment_drafts"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_drafts_assignmentId_studentId_problemId_key" ON "assignment_drafts"("assignmentId", "studentId", "problemId");

-- AddForeignKey
ALTER TABLE "assignment_drafts" ADD CONSTRAINT "assignment_drafts_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_drafts" ADD CONSTRAINT "assignment_drafts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_drafts" ADD CONSTRAINT "assignment_drafts_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;