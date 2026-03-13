CREATE TYPE "ShowProjectCollaboratorRole" AS ENUM ('OWNER', 'EDITOR', 'WRITER', 'PRODUCER', 'VIEWER');

CREATE TABLE "ShowProjectCollaborator" (
    "id" TEXT NOT NULL,
    "showProjectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ShowProjectCollaboratorRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowProjectCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShowProjectCollaborator_showProjectId_userId_key" ON "ShowProjectCollaborator"("showProjectId", "userId");
CREATE INDEX "ShowProjectCollaborator_userId_createdAt_idx" ON "ShowProjectCollaborator"("userId", "createdAt");
CREATE INDEX "ShowProjectCollaborator_showProjectId_role_createdAt_idx" ON "ShowProjectCollaborator"("showProjectId", "role", "createdAt");

ALTER TABLE "ShowProjectCollaborator"
ADD CONSTRAINT "ShowProjectCollaborator_showProjectId_fkey"
FOREIGN KEY ("showProjectId") REFERENCES "ShowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShowProjectCollaborator"
ADD CONSTRAINT "ShowProjectCollaborator_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
