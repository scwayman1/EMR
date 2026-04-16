-- CreateEnum
CREATE TYPE "Role" AS ENUM ('patient', 'clinician', 'operator', 'practice_owner', 'system');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('prospect', 'active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "QualificationStatus" AS ENUM ('unknown', 'pending', 'qualified', 'ineligible', 'expired');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('note', 'lab', 'image', 'diagnosis', 'letter', 'other', 'unclassified');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('scheduled', 'in_progress', 'complete', 'cancelled');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('draft', 'needs_review', 'finalized', 'amended');

-- CreateEnum
CREATE TYPE "OutcomeMetric" AS ENUM ('pain', 'sleep', 'anxiety', 'mood', 'nausea', 'appetite', 'energy', 'adherence', 'side_effects');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('draft', 'sent', 'read');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('requested', 'confirmed', 'cancelled', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('open', 'in_progress', 'done', 'snoozed', 'cancelled');

-- CreateEnum
CREATE TYPE "AgentJobStatus" AS ENUM ('pending', 'claimed', 'running', 'needs_approval', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'active', 'archived', 'out_of_stock');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('open', 'closed', 'adjusted');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'investigating', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('active', 'inactive', 'on_hold');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'scheduled', 'live', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('email', 'sms', 'social', 'print', 'referral', 'event', 'other');

-- CreateEnum
CREATE TYPE "ProductPromptStatus" AS ENUM ('received', 'decomposed', 'accepted', 'archived');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT NOT NULL,
    "status" "PatientStatus" NOT NULL DEFAULT 'prospect',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "intakeAnswers" JSONB,
    "cannabisHistory" JSONB,
    "presentingConcerns" TEXT,
    "treatmentGoals" TEXT,
    "qualificationStatus" "QualificationStatus" NOT NULL DEFAULT 'unknown',
    "qualificationExpiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bio" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartSummary" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "summaryMd" TEXT NOT NULL,
    "completenessScore" INTEGER NOT NULL,
    "missingFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChartSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "kind" "DocumentKind" NOT NULL DEFAULT 'unclassified',
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiClassified" BOOLEAN NOT NULL DEFAULT false,
    "aiTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiConfidence" DOUBLE PRECISION,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "encounterId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT,
    "status" "EncounterStatus" NOT NULL DEFAULT 'scheduled',
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "modality" TEXT NOT NULL DEFAULT 'in_person',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "status" "NoteStatus" NOT NULL DEFAULT 'draft',
    "blocks" JSONB NOT NULL,
    "narrative" TEXT,
    "aiDrafted" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DOUBLE PRECISION,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingSuggestion" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "icd10" JSONB NOT NULL,
    "emLevel" TEXT,
    "rationale" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodingSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "scoringRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "interpretation" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutcomeLog" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "metric" "OutcomeMetric" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutcomeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderAgent" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'draft',
    "body" TEXT NOT NULL,
    "aiDrafted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'requested',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "modality" TEXT NOT NULL DEFAULT 'video',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'open',
    "assigneeRole" "Role",
    "assigneeUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "workflowName" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "status" "AgentJobStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "logs" JSONB NOT NULL DEFAULT '[]',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalRequiredAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "claimedBy" TEXT,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorUserId" TEXT,
    "actorAgent" TEXT,
    "action" TEXT NOT NULL,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchQuery" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "patientId" TEXT,
    "queryText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchResult" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "year" INTEGER,
    "summary" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "quantitativeFindings" JSONB,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ResearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeLaunchStatus" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "readinessScore" INTEGER NOT NULL DEFAULT 0,
    "blockers" JSONB NOT NULL DEFAULT '[]',
    "nextSteps" JSONB NOT NULL DEFAULT '[]',
    "goLiveAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeLaunchStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "format" TEXT NOT NULL,
    "imageUrl" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thcContent" DOUBLE PRECISION,
    "cbdContent" DOUBLE PRECISION,
    "cbnContent" DOUBLE PRECISION,
    "thcvContent" DOUBLE PRECISION,
    "terpeneProfile" JSONB,
    "strainType" TEXT,
    "symptoms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "useCases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "onsetTime" TEXT,
    "duration" TEXT,
    "dosageGuidance" TEXT,
    "beginnerFriendly" BOOLEAN NOT NULL DEFAULT false,
    "labVerified" BOOLEAN NOT NULL DEFAULT false,
    "coaUrl" TEXT,
    "clinicianPick" BOOLEAN NOT NULL DEFAULT false,
    "clinicianNote" TEXT,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "inventoryCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "inventoryCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'standard',
    "imageUrl" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "patientId" TEXT,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "shippingAddress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assigneeUserId" TEXT,
    "role" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clockInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockOutAt" TIMESTAMP(3),
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "minutesWorked" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingModule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCompletion" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER,
    "notes" TEXT,

    CONSTRAINT "TrainingCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportedByUserId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'low',
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "summary" TEXT NOT NULL,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "VendorStatus" NOT NULL DEFAULT 'active',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "audience" TEXT,
    "goal" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "budget" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrompt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "source" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" "ProductPromptStatus" NOT NULL DEFAULT 'received',
    "epicSlug" TEXT,
    "epicTitle" TEXT,
    "summary" TEXT,
    "cards" JSONB NOT NULL DEFAULT '[]',
    "openQuestions" JSONB NOT NULL DEFAULT '[]',
    "decomposedBy" TEXT,
    "sessionPass" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_organizationId_role_idx" ON "Membership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_role_key" ON "Membership"("userId", "organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE INDEX "Patient_organizationId_status_idx" ON "Patient"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_userId_key" ON "Provider"("userId");

-- CreateIndex
CREATE INDEX "Provider_organizationId_idx" ON "Provider"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ChartSummary_patientId_key" ON "ChartSummary"("patientId");

-- CreateIndex
CREATE INDEX "Document_patientId_kind_idx" ON "Document"("patientId", "kind");

-- CreateIndex
CREATE INDEX "Document_organizationId_needsReview_idx" ON "Document"("organizationId", "needsReview");

-- CreateIndex
CREATE INDEX "Encounter_patientId_status_idx" ON "Encounter"("patientId", "status");

-- CreateIndex
CREATE INDEX "Encounter_providerId_scheduledFor_idx" ON "Encounter"("providerId", "scheduledFor");

-- CreateIndex
CREATE INDEX "Note_encounterId_status_idx" ON "Note"("encounterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CodingSuggestion_noteId_key" ON "CodingSuggestion"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_slug_key" ON "Assessment"("slug");

-- CreateIndex
CREATE INDEX "AssessmentResponse_patientId_submittedAt_idx" ON "AssessmentResponse"("patientId", "submittedAt");

-- CreateIndex
CREATE INDEX "OutcomeLog_patientId_metric_loggedAt_idx" ON "OutcomeLog"("patientId", "metric", "loggedAt");

-- CreateIndex
CREATE INDEX "MessageThread_patientId_lastMessageAt_idx" ON "MessageThread"("patientId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_providerId_startAt_idx" ON "Appointment"("providerId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_patientId_startAt_idx" ON "Appointment"("patientId", "startAt");

-- CreateIndex
CREATE INDEX "Task_organizationId_status_idx" ON "Task"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Task_assigneeUserId_status_idx" ON "Task"("assigneeUserId", "status");

-- CreateIndex
CREATE INDEX "AgentJob_status_runAfter_idx" ON "AgentJob"("status", "runAfter");

-- CreateIndex
CREATE INDEX "AgentJob_organizationId_status_idx" ON "AgentJob"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AgentJob_workflowName_status_idx" ON "AgentJob"("workflowName", "status");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_subjectType_subjectId_idx" ON "AuditLog"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "ResearchQuery_userId_createdAt_idx" ON "ResearchQuery"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeLaunchStatus_organizationId_key" ON "PracticeLaunchStatus"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_organizationId_status_idx" ON "Product"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Product_clinicianPick_idx" ON "Product"("clinicianPick");

-- CreateIndex
CREATE INDEX "Product_featured_idx" ON "Product"("featured");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCategory_slug_key" ON "MarketplaceCategory"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceCategory_type_idx" ON "MarketplaceCategory"("type");

-- CreateIndex
CREATE INDEX "MarketplaceCategory_parentId_idx" ON "MarketplaceCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_productId_categoryId_key" ON "ProductCategory"("productId", "categoryId");

-- CreateIndex
CREATE INDEX "ProductReview_productId_createdAt_idx" ON "ProductReview"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_patientId_createdAt_idx" ON "Order"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_organizationId_status_idx" ON "Order"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "Shift_organizationId_startAt_idx" ON "Shift"("organizationId", "startAt");

-- CreateIndex
CREATE INDEX "Shift_assigneeUserId_startAt_idx" ON "Shift"("assigneeUserId", "startAt");

-- CreateIndex
CREATE INDEX "TimeEntry_organizationId_status_idx" ON "TimeEntry"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_clockInAt_idx" ON "TimeEntry"("userId", "clockInAt");

-- CreateIndex
CREATE INDEX "TrainingModule_organizationId_active_idx" ON "TrainingModule"("organizationId", "active");

-- CreateIndex
CREATE INDEX "TrainingCompletion_userId_completedAt_idx" ON "TrainingCompletion"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCompletion_moduleId_userId_key" ON "TrainingCompletion"("moduleId", "userId");

-- CreateIndex
CREATE INDEX "Incident_organizationId_status_idx" ON "Incident"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Incident_organizationId_severity_idx" ON "Incident"("organizationId", "severity");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_status_idx" ON "Vendor"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_category_idx" ON "Vendor"("organizationId", "category");

-- CreateIndex
CREATE INDEX "MarketingCampaign_organizationId_status_idx" ON "MarketingCampaign"("organizationId", "status");

-- CreateIndex
CREATE INDEX "MarketingCampaign_organizationId_channel_idx" ON "MarketingCampaign"("organizationId", "channel");

-- CreateIndex
CREATE INDEX "ProductPrompt_organizationId_receivedAt_idx" ON "ProductPrompt"("organizationId", "receivedAt");

-- CreateIndex
CREATE INDEX "ProductPrompt_author_idx" ON "ProductPrompt"("author");

-- CreateIndex
CREATE INDEX "ProductPrompt_status_idx" ON "ProductPrompt"("status");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartSummary" ADD CONSTRAINT "ChartSummary_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingSuggestion" ADD CONSTRAINT "CodingSuggestion_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeLog" ADD CONSTRAINT "OutcomeLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentJob" ADD CONSTRAINT "AgentJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentJob" ADD CONSTRAINT "AgentJob_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchResult" ADD CONSTRAINT "ResearchResult_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ResearchQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeLaunchStatus" ADD CONSTRAINT "PracticeLaunchStatus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceCategory" ADD CONSTRAINT "MarketplaceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MarketplaceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MarketplaceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingModule" ADD CONSTRAINT "TrainingModule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrompt" ADD CONSTRAINT "ProductPrompt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

