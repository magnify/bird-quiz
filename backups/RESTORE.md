# Restore from backup

Backups are produced weekly by `.github/workflows/backup.yml`.

## What's stored where

- **DB dumps**: `backups/db/YYYY-MM-DD.sql` (committed to this repo, last 12 retained).
- **Storage bucket** (`bird-images` + `originals/` + `manifest.json`): GitHub Release named `backup-YYYY-MM-DD`, asset `storage-YYYY-MM-DD.tar.gz`.

## Restore the database

The dump is `pg_dump --schema=public --no-owner --no-acl`. Restore against the live Supabase project (or a fresh one):

```bash
# Get connection string from Supabase Dashboard → Settings → Database → Connection string (URI)
export DB_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"

# WARNING: this drops/recreates objects in `public` schema. Snapshot first.
psql "$DB_URL" -f backups/db/YYYY-MM-DD.sql
```

For a partial restore (single table), grep the dump:

```bash
# Extract just `quiz_sessions`
sed -n '/^COPY public.quiz_sessions/,/^\\\.$/p' backups/db/YYYY-MM-DD.sql > sessions.sql
```

## Restore storage

```bash
# Download the release asset
gh release download backup-YYYY-MM-DD -p 'storage-*.tar.gz'
tar -xzf storage-YYYY-MM-DD.tar.gz   # extracts to ./storage/

# Re-upload to Supabase Storage. Easiest path: Supabase CLI with S3 protocol,
# or this repo's existing tooling:
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  pnpm tsx scripts/upload-images-to-supabase.ts ./storage
```

If only `manifest.json` is corrupt, restore that file alone via the Supabase
dashboard (Storage → bird-images → upload, overwrite).

## Test the workflow

Trigger a backup manually to verify creds and end-to-end flow:

```bash
gh workflow run backup.yml
gh run watch
```

## Required GitHub secrets

| Secret | Where it goes |
| --- | --- |
| `SUPABASE_DB_URL` | postgres connection string (Dashboard → Settings → Database → URI) |
| `NEXT_PUBLIC_SUPABASE_URL` | already in `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | already in `.env.local` and on Netlify |

Set them with `gh secret set NAME` from the repo root.
