import type { Role } from "@prisma/client";

export const LOCAL_DEMO_PATIENT_USER_ID = "local-demo-patient-user";
export const LOCAL_DEMO_PATIENT_EMAIL = "patient@demo.health";

export function isLocalDemoPreviewEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function isLocalDemoUserId(userId: string | undefined): boolean {
  return isLocalDemoPreviewEnabled() && userId === LOCAL_DEMO_PATIENT_USER_ID;
}

export function getLocalDemoPatientUser() {
  return {
    id: LOCAL_DEMO_PATIENT_USER_ID,
    email: LOCAL_DEMO_PATIENT_EMAIL,
    firstName: "Maya",
    lastName: "Rivera",
    roles: ["patient" as Role],
    organizationId: "local-demo-org",
    organizationName: "Leafjourney Preview Clinic",
  };
}

