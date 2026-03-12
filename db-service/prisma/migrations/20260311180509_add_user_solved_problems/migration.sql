/*
  Warnings:

  - You are about to drop the column `deadline` on the `exams` table. All the data in the column will be lost.
  - Added the required column `startTime` to the `exams` table without a default value. This is not possible if the table is not empty.
  - Made the column `duration` on table `exams` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "exams_deadline_idx";

-- AlterTable
ALTER TABLE "Problem" ALTER COLUMN "codeStubs" DROP NOT NULL;

-- AlterTable
ALTER TABLE "assignment_submissions" ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "grade" INTEGER;

-- AlterTable
ALTER TABLE "exam_submissions" ADD COLUMN     "autoSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "fullscreenExitCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grade" INTEGER,
ADD COLUMN     "proctoringViolations" JSONB DEFAULT '[]',
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tabSwitchCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warningCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "solutions" SET DEFAULT '{}',
ALTER COLUMN "submittedAt" DROP NOT NULL,
ALTER COLUMN "submittedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "exams" DROP COLUMN "deadline",
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "duration" SET NOT NULL;

-- CreateTable
CREATE TABLE "user_solved_problems" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_solved_problems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_solved_problems_userId_idx" ON "user_solved_problems"("userId");

-- CreateIndex
CREATE INDEX "user_solved_problems_problemId_idx" ON "user_solved_problems"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "user_solved_problems_userId_problemId_key" ON "user_solved_problems"("userId", "problemId");

-- CreateIndex
CREATE INDEX "exams_startTime_idx" ON "exams"("startTime");

-- AddForeignKey
ALTER TABLE "user_solved_problems" ADD CONSTRAINT "user_solved_problems_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_solved_problems" ADD CONSTRAINT "user_solved_problems_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
