-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('DSA', 'IDE');

-- AlterTable
ALTER TABLE "assignments"
ADD COLUMN "type" "AssignmentType" NOT NULL DEFAULT 'DSA',
ADD COLUMN "ideFiles" JSONB;

-- AlterTable
ALTER TABLE "assignment_submissions"
ADD COLUMN "ideWorkspace" JSONB;

-- CreateTable
CREATE TABLE "assignment_ide_drafts" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "workspace" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_ide_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignment_ide_drafts_assignmentId_studentId_key" ON "assignment_ide_drafts"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "assignment_ide_drafts_assignmentId_idx" ON "assignment_ide_drafts"("assignmentId");

-- CreateIndex
CREATE INDEX "assignment_ide_drafts_studentId_idx" ON "assignment_ide_drafts"("studentId");

-- AddForeignKey
ALTER TABLE "assignment_ide_drafts" ADD CONSTRAINT "assignment_ide_drafts_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_ide_drafts" ADD CONSTRAINT "assignment_ide_drafts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
