/**
 * Sync Demo Data to Staging Database
 * 
 * This script serves as a utility reference for syncing production demo data 
 * into the isolated staging database.
 * 
 * Instructions:
 * 1. Supabase doesn't natively support cross-project logical replication easily on the free/pro tier.
 * 2. To safely sync the demo patient and practice (owner@demo.health), use the Supabase CLI:
 * 
 *    # Dump the specific schemas or tables needed from Production
 *    supabase db dump --db-url "$PRODUCTION_DB_URL" -f prod_dump.sql
 * 
 *    # Restore them to the Staging Database
 *    supabase db push --db-url "$STAGING_DB_URL" prod_dump.sql
 * 
 * For continuous syncing, we recommend setting up a scheduled GitHub Action that runs
 * this pg_dump and pg_restore pipeline, OR simply seeding the staging database using
 * your existing seed scripts:
 * 
 *    npm run db:seed
 */

console.log("Use the Supabase CLI to dump and restore the demo data across environments.");
