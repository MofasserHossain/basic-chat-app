-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "adminId" TEXT,
ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_conversations" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'member';

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
