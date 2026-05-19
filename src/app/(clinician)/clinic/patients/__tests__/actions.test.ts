import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * EMR-655 — createPatient server action.
 *
 * Tests live in a node environment (see vitest.config.mts). We mock prisma,
 * the auth session, and next/cache, then assert that:
 *   - validation rejects missing required fields,
 *   - the happy path writes Patient + 3 EmergencyContacts (as JSON) + a
 *     PatientCoverage row inside a single $transaction,
 *   - on transaction failure, no partial state remains (rolls back).
 */

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    patient: {
      create: vi.fn(),
    },
    patientCoverage: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const mockUser = {
    id: "user_clin_1",
    email: "clin@example.com",
    firstName: "Cli",
    lastName: "Nician",
    roles: ["clinician"] as string[],
    organizationId: "org_1" as string | null,
    organizationName: "Leaf Clinic",
  };

  const requireUserMock = vi.fn(async () => mockUser);

  return { mockPrisma, mockUser, requireUserMock };
});

const { mockPrisma, mockUser, requireUserMock } = hoisted;

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: () => hoisted.requireUserMock(),
}));

// Import AFTER the mocks are wired.
import { createPatient } from "../actions";

function validInput() {
  return {
    personal: {
      firstName: "Alex",
      lastName: "Jones",
      dateOfBirth: "1990-05-12",
      email: "alex@example.com",
      phone: "(555) 123-4567",
      addressLine1: "123 Main St",
      addressLine2: "",
      city: "Eureka",
      state: "CA",
      postalCode: "95501",
      sex: "Female",
      race: "Mixed",
      maritalStatus: "Single",
      avatarDataUrl: "",
    },
    emergencyContacts: [
      { name: "Pat Jones", phone: "555-111-1111", email: "pat@example.com", relationship: "Spouse" },
      { name: "Sam Jones", phone: "555-222-2222", email: "sam@example.com", relationship: "Sibling" },
      { name: "Lee Jones", phone: "555-333-3333", email: "lee@example.com", relationship: "Parent" },
    ],
    insurance: {
      payerName: "Blue Cross",
      memberId: "ABC123",
      groupNumber: "G-9",
      planName: "PPO Gold",
      subscriberName: "Alex Jones",
      relationshipToSubscriber: "self",
    },
  };
}

function resetAll() {
  vi.clearAllMocks();
  mockUser.roles = ["clinician"];
  mockUser.organizationId = "org_1";
  requireUserMock.mockImplementation(async () => mockUser);

  // Default $transaction implementation: invoke the callback with a tx
  // object that mirrors the top-level mockPrisma so callers can await the
  // same patient/patientCoverage/auditLog mocks.
  mockPrisma.$transaction.mockImplementation(async (fn: any) => {
    return fn(mockPrisma);
  });
  mockPrisma.patient.create.mockResolvedValue({
    id: "patient_new",
    organizationId: "org_1",
    firstName: "Alex",
    lastName: "Jones",
  });
  mockPrisma.patientCoverage.create.mockResolvedValue({ id: "cov_new" });
  mockPrisma.auditLog.create.mockResolvedValue({ id: "audit_new" });
}

describe("createPatient — validation", () => {
  beforeEach(resetAll);

  it("rejects when first name is missing", async () => {
    const input = validInput();
    input.personal.firstName = "";
    const result = await createPatient(input);
    expect(result.ok).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects when last name is missing", async () => {
    const input = validInput();
    input.personal.lastName = "";
    const result = await createPatient(input);
    expect(result.ok).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects when an emergency contact name is missing", async () => {
    const input = validInput();
    input.emergencyContacts[1].name = "";
    const result = await createPatient(input);
    expect(result.ok).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects when fewer than three emergency contacts are supplied", async () => {
    const input = validInput();
    input.emergencyContacts = input.emergencyContacts.slice(0, 2) as any;
    const result = await createPatient(input);
    expect(result.ok).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects when insurance memberId is missing", async () => {
    const input = validInput();
    input.insurance.memberId = "";
    const result = await createPatient(input);
    expect(result.ok).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an obviously malformed email", async () => {
    const input = validInput();
    input.personal.email = "not-an-email";
    const result = await createPatient(input);
    expect(result.ok).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("createPatient — happy path", () => {
  beforeEach(resetAll);

  it("creates the patient + coverage inside a single $transaction", async () => {
    const result = await createPatient(validInput());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patientId).toBe("patient_new");
    }

    // One transaction, with both writes scoped inside it.
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.patient.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.patientCoverage.create).toHaveBeenCalledTimes(1);
  });

  it("stores the 3 emergency contacts on the Patient.intakeAnswers JSON", async () => {
    await createPatient(validInput());

    const patientArgs = mockPrisma.patient.create.mock.calls[0][0];
    const intake = patientArgs.data.intakeAnswers as Record<string, unknown>;
    expect(Array.isArray(intake.emergencyContacts)).toBe(true);
    expect((intake.emergencyContacts as unknown[]).length).toBe(3);
    expect((intake.emergencyContacts as any[])[0]).toMatchObject({
      name: "Pat Jones",
      relationship: "Spouse",
    });
  });

  it("links PatientCoverage to the newly created patient", async () => {
    await createPatient(validInput());

    const covArgs = mockPrisma.patientCoverage.create.mock.calls[0][0];
    expect(covArgs.data).toMatchObject({
      patientId: "patient_new",
      payerName: "Blue Cross",
      memberId: "ABC123",
      groupNumber: "G-9",
    });
  });

  it("writes an audit log row for patient.created", async () => {
    await createPatient(validInput());

    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    const auditArgs = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(auditArgs.data).toMatchObject({
      organizationId: "org_1",
      actorUserId: "user_clin_1",
      action: "patient.created",
      subjectType: "Patient",
      subjectId: "patient_new",
    });
  });
});

describe("createPatient — rollback", () => {
  beforeEach(resetAll);

  it("returns ok:false and surfaces no partial writes when the coverage insert throws", async () => {
    // Real prisma rolls everything back when the callback throws; our mock
    // simulates that by failing the whole $transaction call. We assert the
    // action surfaces a clean error AND does not write an audit log entry
    // (which lives outside the transaction in many handlers — here it must
    // be inside, gated on the transaction succeeding).
    mockPrisma.patientCoverage.create.mockRejectedValueOnce(
      new Error("simulated DB failure"),
    );
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      // Mirror real prisma: invoke the callback, let it throw, propagate.
      return fn(mockPrisma);
    });

    const result = await createPatient(validInput());

    expect(result.ok).toBe(false);
    // The patient.create call happened inside the transaction but prisma
    // would have rolled it back. The handler must NOT then go write an
    // audit log row outside the failed transaction.
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });
});
