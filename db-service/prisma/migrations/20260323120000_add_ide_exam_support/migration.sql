ALTER TABLE "exams"
ADD COLUMN "type" "AssignmentType" NOT NULL DEFAULT 'DSA',
ADD COLUMN "ideFiles" JSONB;

ALTER TABLE "exam_submissions"
ADD COLUMN "ideWorkspace" JSONB;
