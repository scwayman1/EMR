import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "documents";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 5;

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
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return key;
}

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

export async function deleteDocument(storageKey: string): Promise<void> {
  const client = getClient();
  const { error } = await client.storage.from(getBucket()).remove([storageKey]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export function storageIsConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
