-- CreateEnum
CREATE TYPE "EmojiFeeling" AS ENUM ('much_better', 'better', 'same', 'worse', 'much_worse');

-- CreateTable
CREATE TABLE "EmojiOutcome" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT,
    "feeling" "EmojiFeeling" NOT NULL,
    "reliefLevel" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "notedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmojiOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmojiOutcome_patientId_takenAt_idx" ON "EmojiOutcome"("patientId", "takenAt" DESC);

-- CreateIndex
CREATE INDEX "EmojiOutcome_organizationId_takenAt_idx" ON "EmojiOutcome"("organizationId", "takenAt" DESC);

-- CreateIndex
CREATE INDEX "EmojiOutcome_productId_idx" ON "EmojiOutcome"("productId");

-- AddForeignKey
ALTER TABLE "EmojiOutcome" ADD CONSTRAINT "EmojiOutcome_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmojiOutcome" ADD CONSTRAINT "EmojiOutcome_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmojiOutcome" ADD CONSTRAINT "EmojiOutcome_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CannabisProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
