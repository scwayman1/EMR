/**
 * Document storage module.
 *
 * Wraps Supabase Storage for the `documents` bucket. All uploads go
 * through `uploadDocument`, all downloads via `createSignedUrl`.
 * Callers never touch the Supabase SDK directly \u2014 so if we ever
 * swap the backend (S3, local stub, etc.) it's a one-file change.
 *
 * Environment:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (server-only; NEVER expose to client)
 *   STORAGE_BUCKET              (defaults to "documents")
 *
 * If any of the required env vars are missing, operations throw a
 * clear error so misconfiguration surfaces immediately instead of
 * corrupting a Document row with no underlying object.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "documents";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 minutes

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

function getBucket(): string {
  return process.env.STORAGE_BUCKET || DEFAULT_BUCKET;
}

/**
 * Upload bytes to storage. Returns the storage key to persist on the
 * Document row. The key layout is
 *   <organizationId>/<patientId>/<uuid>-<sanitizedName>
 * so a list-by-prefix on org or patient works without a DB lookup.
 * The uuid segment is independent of the Document row id \u2014 that way
 * we can upload first, then insert, and retries won't collide.
 */
export async function uploadDocument(params: {
  organizationId: string;
  patientId: string;
  filename: string;
  contentType: string;
  body: Buffer | ArrayBuffer | Uint8Array;
}): Promise<string> {
  const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const key = `${params.organizationId}/${params.patientId}/${crypto.randomUUID()}-${safeName}`;

  const client = getClient();
  const { error } = await client.storage
    .from(getBucket())
    .upload(key, params.body as Buffer, {
      contentType: params.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
  return key;
}

/**
 * Return a short-lived signed URL the browser can redirect to.
 * Supabase sets Content-Type from the upload, so the browser
 * either renders inline (PDF, images) or downloads (DOCX, XLSX).
 */
export async function createSignedUrl(
  storageKey: string,
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const client = getClient();
  const { data, error } = await client.storage
    .from(getBucket())
    .createSignedUrl(storageKey, ttlSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

/**
 * Remove a stored object. Intended for admin/cleanup paths; Document
 * rows use a `deletedAt` soft-delete in the schema, so we don't call
 * this from the soft-delete path.
 */
export async function deleteDocument(storageKey: string): Promise<void> {
  const client = getClient();
  const { error } = await client.storage.from(getBucket()).remove([storageKey]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export function storageIsConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
