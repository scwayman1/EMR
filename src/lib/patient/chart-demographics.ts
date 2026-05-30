type Intake = Record<string, unknown>;

function asText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function objectText(
  value: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const text = asText(value[key]);
    if (text) return text;
  }
  return null;
}

export function formatDemographicValue(
  value: unknown,
  fallback = "Not recorded",
): string {
  const scalar = asText(value);
  if (scalar) return scalar;

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatDemographicValue(item, ""))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : fallback;
  }

  if (value && typeof value === "object") {
    const text = objectText(value as Record<string, unknown>, [
      "label",
      "display",
      "name",
      "value",
      "text",
      "title",
    ]);
    return text ?? fallback;
  }

  return fallback;
}

export function formatInsurancePlan(intake: Intake): string {
  const explicit = asText(intake.insurancePlan);
  if (explicit) return explicit;

  const insurance = intake.insurance;
  const scalar = asText(insurance);
  if (scalar) return scalar;

  if (insurance && typeof insurance === "object" && !Array.isArray(insurance)) {
    const record = insurance as Record<string, unknown>;
    const payer = objectText(record, [
      "providerName",
      "payerName",
      "carrier",
      "company",
      "name",
    ]);
    const plan = objectText(record, ["planName", "plan", "planType"]);
    const parts = [payer, plan].filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join(" - ") : "On file";
  }

  return "Not on file";
}

export function formatInsuranceMemberId(intake: Intake): string | null {
  const topLevel = asText(intake.insuranceId) ?? asText(intake.memberId);
  if (topLevel) return topLevel;

  const insurance = intake.insurance;
  if (insurance && typeof insurance === "object" && !Array.isArray(insurance)) {
    return objectText(insurance as Record<string, unknown>, [
      "memberId",
      "subscriberId",
      "policyNumber",
      "id",
    ]);
  }

  return null;
}

export function formatEmergencyContact(value: unknown): string | null {
  const scalar = asText(value);
  if (scalar) return scalar;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = objectText(record, ["name", "fullName", "contactName"]);
  const relationship = objectText(record, ["relationship"]);
  const phone = objectText(record, ["phone", "phoneNumber", "mobile"]);
  const email = objectText(record, ["email"]);
  const parts = [name, relationship, phone, email].filter(
    (part): part is string => Boolean(part),
  );

  return parts.length > 0 ? parts.join(" - ") : null;
}
