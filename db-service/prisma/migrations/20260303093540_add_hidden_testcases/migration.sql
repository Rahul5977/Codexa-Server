-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "hiddenTestcases" JSONB[] DEFAULT ARRAY[]::JSONB[];
