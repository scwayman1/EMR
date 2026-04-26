-- EMR-244: vendor-level state shipping restriction matrix.
-- Empty array means "not configured" — checkout validator treats that as
-- blocked (fail-safe). Hemp vendors are seeded to all 50 + DC; dispensary
-- vendors get only the state(s) on their license at onboarding.

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN "shippableStates" TEXT[] DEFAULT ARRAY[]::TEXT[];
