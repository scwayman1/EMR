-- Education — Cannabis Combo Wheel compounds
-- Migrates the hardcoded COMPOUNDS array out of ComboWheel.tsx into a
-- queryable global catalog. Rows are public educational content (no PHI,
-- no org scope).

-- CreateEnum
CREATE TYPE "CompoundType" AS ENUM ('cannabinoid', 'terpene');

-- CreateEnum
CREATE TYPE "CompoundEvidenceLevel" AS ENUM ('strong', 'moderate', 'emerging');

-- CreateTable
CREATE TABLE "EducationCompound" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompoundType" NOT NULL,
    "color" TEXT NOT NULL,
    "evidence" "CompoundEvidenceLevel" NOT NULL,
    "description" TEXT NOT NULL,
    "symptoms" TEXT[],
    "benefits" TEXT[],
    "risks" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationCompound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EducationCompound_type_sortOrder_key" ON "EducationCompound"("type", "sortOrder");

-- CreateIndex
CREATE INDEX "EducationCompound_type_active_sortOrder_idx" ON "EducationCompound"("type", "active", "sortOrder");

-- Seed: initial Combo Wheel catalog. Same content previously hardcoded in
-- src/components/education/ComboWheel.tsx. Idempotent (ON CONFLICT DO NOTHING)
-- so re-running this migration on a partially-seeded environment is safe.
INSERT INTO "EducationCompound" ("id", "name", "type", "color", "evidence", "description", "symptoms", "benefits", "risks", "sortOrder", "updatedAt") VALUES
('thc',          'THC',          'cannabinoid', '#3A8560', 'strong',
 'Primary psychoactive cannabinoid. CB1/CB2 agonist. Start low (2.5mg), titrate slowly.',
 ARRAY['Pain','Nausea','Insomnia','Appetite loss','PTSD','Muscle spasms'],
 ARRAY['Potent analgesic','Antiemetic','Sleep aid','Appetite stimulant'],
 ARRAY['Psychoactivity','Anxiety at high doses','Cognitive effects','Dependence risk'],
 0, CURRENT_TIMESTAMP),

('cbd',          'CBD',          'cannabinoid', '#4A90D9', 'strong',
 'Non-psychoactive. Negative allosteric modulator at CB1. FDA-approved for epilepsy (Epidiolex).',
 ARRAY['Anxiety','Inflammation','Seizures','Pain','Insomnia'],
 ARRAY['Non-intoxicating','Anxiolytic','Anti-inflammatory','Neuroprotective','Modulates THC effects'],
 ARRAY['Drug interactions (CYP2D6, CYP3A4)','Liver enzyme elevation at very high doses'],
 1, CURRENT_TIMESTAMP),

('cbn',          'CBN',          'cannabinoid', '#7D3F9B', 'emerging',
 'Mildly sedating oxidation product of THC. Best for sleep formulations.',
 ARRAY['Insomnia','Pain','Inflammation'],
 ARRAY['Sedating','Pain relief','Anti-inflammatory'],
 ARRAY['Limited safety data','Mild sedation'],
 2, CURRENT_TIMESTAMP),

('cbg',          'CBG',          'cannabinoid', '#D4944F', 'emerging',
 'Parent cannabinoid. 2024 trial: single 20mg dose reduced anxiety within 20 minutes.',
 ARRAY['Anxiety','Inflammation','IBD','Glaucoma'],
 ARRAY['Anxiolytic','Anti-inflammatory','Neuroprotective','Non-intoxicating'],
 ARRAY['Limited long-term data'],
 3, CURRENT_TIMESTAMP),

('thca',         'THCA',         'cannabinoid', '#5C8A4F', 'emerging',
 'Raw, unheated form of THC. Non-psychoactive until decarboxylated.',
 ARRAY['Nausea','Inflammation','Neurodegeneration'],
 ARRAY['Non-intoxicating (raw)','Anti-inflammatory','Antiemetic'],
 ARRAY['Converts to THC with heat'],
 4, CURRENT_TIMESTAMP),

('cbda',         'CBDA',         'cannabinoid', '#3A6B9B', 'emerging',
 'Raw form of CBD. Shows greater 5-HT1A affinity than CBD in preclinical models.',
 ARRAY['Nausea','Anxiety','Inflammation'],
 ARRAY['Potent antiemetic','Anti-inflammatory','Non-intoxicating'],
 ARRAY['Unstable — converts to CBD with heat'],
 5, CURRENT_TIMESTAMP),

('myrcene',      'Myrcene',      'terpene',     '#6DAF6D', 'moderate',
 'Most abundant cannabis terpene. Also in hops, mango. Promotes relaxation and sleep.',
 ARRAY['Pain','Insomnia','Inflammation','Muscle tension'],
 ARRAY['Sedating','Analgesic','Anti-inflammatory','Enhances THC absorption'],
 ARRAY['Sedation at high doses'],
 0, CURRENT_TIMESTAMP),

('limonene',     'Limonene',     'terpene',     '#F6D365', 'moderate',
 'Citrus terpene. Uplifting, mood-enhancing. Found in lemon, orange, and sativa-dominant strains.',
 ARRAY['Depression','Anxiety','Stress','Nausea'],
 ARRAY['Mood elevation','Anxiolytic','Antifungal','Gastroprotective'],
 ARRAY['May cause reflux in sensitive individuals'],
 1, CURRENT_TIMESTAMP),

('linalool',     'Linalool',     'terpene',     '#B388D9', 'moderate',
 'Floral terpene also in lavender. Calming, stress-reducing. Synergizes with CBD for anxiety.',
 ARRAY['Anxiety','Insomnia','Pain','Seizures'],
 ARRAY['Calming','Anxiolytic','Analgesic','Anticonvulsant'],
 ARRAY['Potential skin sensitivity (topical)'],
 2, CURRENT_TIMESTAMP),

('pinene',       'Pinene',       'terpene',     '#4A7A5C', 'moderate',
 'Pine/fir scent. May counteract THC-related memory impairment. Found in rosemary, basil.',
 ARRAY['Inflammation','Asthma','Cognitive fog'],
 ARRAY['Bronchodilator','Anti-inflammatory','Memory aid','Alertness'],
 ARRAY['May counteract sedating effects'],
 3, CURRENT_TIMESTAMP),

('caryophyllene','Caryophyllene','terpene',     '#8B6F47', 'moderate',
 'Only terpene that binds CB2 directly. Also in black pepper, cloves. Anti-inflammatory powerhouse.',
 ARRAY['Pain','Inflammation','Anxiety','Depression'],
 ARRAY['CB2 agonist (unique terpene)','Anti-inflammatory','Analgesic','Gastroprotective'],
 ARRAY['Generally well tolerated'],
 4, CURRENT_TIMESTAMP),

('humulene',     'Humulene',     'terpene',     '#9B7A3A', 'emerging',
 'Also in hops and ginger. Unique appetite-suppressing terpene — rare in cannabis therapeutics.',
 ARRAY['Inflammation','Pain','Appetite (suppressant)'],
 ARRAY['Anti-inflammatory','Appetite suppressant','Antibacterial'],
 ARRAY['May reduce appetite'],
 5, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
