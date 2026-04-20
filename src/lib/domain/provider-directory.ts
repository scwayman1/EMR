/**
 * Provider Directory — pure helpers.
 *
 * Used by the /clinic/providers page to rank providers in response to a
 * free-form search query. Case-insensitive substring match against name,
 * specialties, and NPI. Exact NPI matches float to the top.
 *
 * Kept dependency-free so it can be unit-tested without Prisma, React, or
 * Next. The page performs a coarse database filter first, then calls
 * rankProviders() to order the result set for display.
 */

export interface ProviderRecord {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  specialties: string[];
  npi: string | null;
  assignedPatientCount: number;
}

/** Normalize a string for substring comparison. */
function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

/** Does `haystack` contain `needle` (case-insensitive)? */
function contains(haystack: string | null | undefined, needle: string): boolean {
  if (!needle) return false;
  return norm(haystack).includes(norm(needle));
}

/**
 * Score a provider against the search query.
 *
 * Higher score = better match. Scoring is tiered so that NPI exact match
 * always wins over any substring match.
 *
 *   3000  exact NPI match
 *   2000  any substring match on NPI
 *   1000  substring match on full name ("first last")
 *    500  substring match on first or last name independently
 *    250  substring match on any specialty
 *    100  substring match on title
 *      0  no match
 */
export function scoreProvider(p: ProviderRecord, query: string): number {
  const q = norm(query);
  if (!q) return 0;

  if (p.npi && norm(p.npi) === q) return 3000;
  if (contains(p.npi, q)) return 2000;

  const fullName = `${p.firstName} ${p.lastName}`;
  if (contains(fullName, q)) return 1000;

  if (contains(p.firstName, q) || contains(p.lastName, q)) return 500;

  if (p.specialties.some((s) => contains(s, q))) return 250;

  if (contains(p.title, q)) return 100;

  return 0;
}

/**
 * Rank providers for display.
 *
 * When `searchQuery` is empty/undefined, returns providers sorted by
 * last name, then first name (stable alpha order).
 *
 * When `searchQuery` is provided:
 *   - Filters out providers with score === 0
 *   - Sorts descending by score
 *   - Ties broken by last name, then first name
 */
export function rankProviders(
  providers: ProviderRecord[],
  searchQuery?: string,
): ProviderRecord[] {
  const q = norm(searchQuery);

  if (!q) {
    return [...providers].sort((a, b) => {
      const byLast = norm(a.lastName).localeCompare(norm(b.lastName));
      if (byLast !== 0) return byLast;
      return norm(a.firstName).localeCompare(norm(b.firstName));
    });
  }

  return providers
    .map((p) => ({ p, score: scoreProvider(p, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const byLast = norm(a.p.lastName).localeCompare(norm(b.p.lastName));
      if (byLast !== 0) return byLast;
      return norm(a.p.firstName).localeCompare(norm(b.p.firstName));
    })
    .map(({ p }) => p);
}
