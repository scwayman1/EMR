# EMR-470 — Controller audit log migration

Adds the `ControllerAuditLog` table that backs the persisted writer in
`src/lib/auth/audit-stub.ts` (path retained for storm-time stability; the
filename is a misnomer post-EMR-470 — body is real persistence).

## Files

- `migration.sql` — Prisma-managed. Creates the table + indexes. Runs as part
  of the normal `prisma migrate deploy` flow under the migrator role.
- `append-only.sql` — **NOT** Prisma-managed. Ops must apply this after the
  table exists, as a privileged DB user. It:
  1. Grants the app role only `INSERT, SELECT`.
  2. Revokes `UPDATE, DELETE, TRUNCATE` from the app role.
  3. Installs `BEFORE UPDATE` / `BEFORE DELETE` triggers that raise
     `insufficient_privilege` — defense in depth so the table stays
     append-only even if grants drift.

The script uses `psql` variable substitution (`:"app_role"`); invoke as:

```
psql "$DATABASE_URL" \
  -v app_role="leafjourney_app" \
  -f append-only.sql
```

Apply once per environment (staging, prod). The migrator role must be
distinct from the app role — Prisma needs `UPDATE/DELETE` privileges on
every table it owns for future migrations to run.

## Compliance note

The audit log is single-insert, no queue, no retry — see ticket scope. If
a controller mutation fails to insert an audit row (DB down, etc.), the
mutation still succeeds and the audit failure is logged via
`console.error`. A durable queue is tracked as a follow-up.
