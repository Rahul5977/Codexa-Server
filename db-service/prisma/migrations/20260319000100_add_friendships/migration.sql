-- Create friendships table for social graph
CREATE TABLE "friendships" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- Prevent duplicate friendship pairs
CREATE UNIQUE INDEX "friendships_userAId_userBId_key" ON "friendships"("userAId", "userBId");

-- Query performance indexes
CREATE INDEX "friendships_userAId_idx" ON "friendships"("userAId");
CREATE INDEX "friendships_userBId_idx" ON "friendships"("userBId");

-- Foreign keys to users
ALTER TABLE "friendships"
ADD CONSTRAINT "friendships_userAId_fkey"
FOREIGN KEY ("userAId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "friendships"
ADD CONSTRAINT "friendships_userBId_fkey"
FOREIGN KEY ("userBId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
