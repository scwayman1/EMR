-- AlterTable
-- `IF NOT EXISTS` so this migration can baseline against prod DBs where
-- the column was added manually via `db push` or SQL Editor before we
-- switched to `migrate deploy`. Safe no-op on up-to-date databases.
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "chartingCompletedAt" TIMESTAMP(3);
