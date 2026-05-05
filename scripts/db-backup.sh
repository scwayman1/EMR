#!/bin/bash
# ==============================================================================
# Leafjourney EMR - HIPAA Compliant Database Backup
# ==============================================================================
# This script dumps the Supabase PostgreSQL database, encrypts the dump
# using AES-256-CBC, and uploads it to an S3 bucket with strict lifecycle rules.
#
# Requires: pg_dump, openssl, aws-cli
# ==============================================================================

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="leafjourney_emr_backup_${TIMESTAMP}.sql"
ENCRYPTED_FILENAME="${BACKUP_FILENAME}.enc"
S3_BUCKET="s3://leafjourney-hipaa-backups/production/"

echo "[$(date)] Starting secure database backup..."

# 1. Ensure required environment variables exist
if [ -z "$DATABASE_DIRECT_URL" ] || [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
  echo "ERROR: DATABASE_DIRECT_URL and BACKUP_ENCRYPTION_KEY must be set."
  exit 1
fi

# 2. Dump the database securely to memory/disk
echo "[$(date)] Dumping database from Supabase..."
# We use the direct connection string (port 5432) for pg_dump
pg_dump "$DATABASE_DIRECT_URL" --clean --if-exists --no-owner --no-privileges > "$BACKUP_FILENAME"

# 3. Encrypt the dump using AES-256
echo "[$(date)] Encrypting payload (AES-256)..."
openssl enc -aes-256-cbc -salt -in "$BACKUP_FILENAME" -out "$ENCRYPTED_FILENAME" -pass pass:"$BACKUP_ENCRYPTION_KEY" -pbkdf2

# 4. Upload to S3 (Assuming AWS CLI is configured with correct IAM role)
echo "[$(date)] Uploading to secure S3 vault..."
aws s3 cp "$ENCRYPTED_FILENAME" "$S3_BUCKET" --server-side-encryption AES256

# 5. Cleanup local unencrypted and encrypted files securely
echo "[$(date)] Shredding local artifacts..."
# Use shred to overwrite the file data before deletion, preventing recovery
if command -v shred &> /dev/null; then
  shred -u "$BACKUP_FILENAME"
  shred -u "$ENCRYPTED_FILENAME"
else
  rm -P "$BACKUP_FILENAME" 2>/dev/null || rm "$BACKUP_FILENAME"
  rm -P "$ENCRYPTED_FILENAME" 2>/dev/null || rm "$ENCRYPTED_FILENAME"
fi

echo "[$(date)] Backup completed successfully."
