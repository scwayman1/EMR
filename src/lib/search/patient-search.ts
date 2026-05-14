// Smart partial-match for clinician patient search boxes.
// Shared by EMR-599 (/clinic/patients) and EMR-570 (/clinic landing) so the
// behaviour is identical in both places.
//
// A single query string is matched (case-insensitive) against the patient's
// first name, last name, date of birth, and phone number. DOB is compared
// across the separator styles a clinician is likely to type
// (`5/17/1980`, `05-17-1980`, `1980-05-17`, etc.) and phone is compared
// digits-only so hyphens and parens don't matter.

export interface SearchablePatient {
  firstName: string;
  lastName: string;
  /** ISO 8601 date or full timestamp; only the YYYY-MM-DD portion is used. */
  dob: string | null;
  /** Raw stored phone — may contain separators, country codes, etc. */
  phone: string | null;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function dobVariants(iso: string | null): string[] {
  if (!iso) return [];
  const date = iso.slice(0, 10);
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return [];
  const mTrim = String(parseInt(m, 10));
  const dTrim = String(parseInt(d, 10));
  return [
    `${y}-${m}-${d}`,
    `${m}/${d}/${y}`,
    `${mTrim}/${dTrim}/${y}`,
    `${m}-${d}-${y}`,
    `${mTrim}-${dTrim}-${y}`,
    `${m}.${d}.${y}`,
    `${mTrim}.${dTrim}.${y}`,
    `${y}${m}${d}`,
    `${m}${d}${y}`,
  ];
}

export function patientMatchesQuery(
  p: SearchablePatient,
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

  const qDigits = digitsOnly(q);
  if (qDigits.length >= 2 && p.phone) {
    const phoneDigits = digitsOnly(p.phone);
    if (phoneDigits.includes(qDigits)) return true;
  }

  for (const v of dobVariants(p.dob)) {
    if (v.includes(q)) return true;
  }

  return false;
}
