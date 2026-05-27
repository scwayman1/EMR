# Practice Onboarding Controller - Backend Foundation (Cluster A)

## Context
The super admin "Practice Onboarding Controller" requires a robust backend foundation to support its 15-step wizard. This design covers EMR-420, EMR-428, EMR-429, and EMR-435.

## Design

### 1. Draft Storage & Validation (EMR-435 & EMR-429)
- **Draft Storage:** We will continue using the existing `PracticeConfiguration` Prisma model. We do not need a separate draft table.
- **Strict Partial Validation:** We will define a strict Zod schema representing the *final published state* of a practice configuration. For the step-by-step autosave API (`PATCH /api/configs/[draftId]`), we will use `.partial()` on this schema. This allows partial/missing data during the draft phase, but ensures any provided fields are strictly valid (e.g., NPI must be exactly 10 digits).
- **Publish Validation:** The final publish step will validate against the strict, non-partial schema to guarantee data integrity before activating the practice.

### 2. Inline Organization Creation (EMR-420)
- **Step 1 UX:** We will add a "Create New Org" button directly inside Step 1 of the wizard.
- **API Integration:** This button will open a quick form that `POST`s to the existing `/api/orgs` endpoint. Upon success, it will immediately select the newly created organization and allow the user to proceed with creating a Practice under it.

### 3. RBAC (EMR-428)
- **Global Access:** We will maintain the coarse `requireImplementationAdmin()` check. Anyone with the `implementation_admin` or `super_admin` role will have global, unrestricted access to create and edit onboarding wizard drafts across the platform.

## Dependencies
- Existing Prisma schema (`PracticeConfiguration` model).
- Existing `/api/orgs` and `/api/practices` endpoints.
