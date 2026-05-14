// Partial-match for the clinician provider directory (/clinic/providers).
// Matches the patient-search behaviour on consistency grounds (see
// EMR-570) so the two search boxes feel identical to the user.
//
// Fields:
//   - firstName / lastName  (partial, case-insensitive)
//   - title                 (partial — "MD, Integrative Oncology" etc.)
//   - specialties[]         (partial against each entry)
//   - practiceAddress       (partial — full freeform address)
//   - hospitalAffiliations[] (partial against each entry)

export interface SearchableProvider {
  firstName: string;
  lastName: string;
  title: string | null;
  specialties: string[];
  practiceAddress: string | null;
  hospitalAffiliations: string[];
}

export function providerMatchesQuery(
  p: SearchableProvider,
  rawQuery: string,
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const first = p.firstName.toLowerCase();
  const last = p.lastName.toLowerCase();
  if (
    first.includes(q) ||
    last.includes(q) ||
    `${first} ${last}`.includes(q)
  ) {
    return true;
  }

  if (p.title && p.title.toLowerCase().includes(q)) return true;

  for (const s of p.specialties) {
    if (s.toLowerCase().includes(q)) return true;
  }

  if (p.practiceAddress && p.practiceAddress.toLowerCase().includes(q)) {
    return true;
  }

  for (const h of p.hospitalAffiliations) {
    if (h.toLowerCase().includes(q)) return true;
  }

  return false;
}
