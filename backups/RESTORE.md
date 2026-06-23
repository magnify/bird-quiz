# Restore from backup

Backups are produced by running `pnpm backup` from the repo root (loads
`.env.local`). It writes:

- `backups/data/*.ndjson` — one file per public table, one JSON record per line
  (via PostgREST). Schema is **not** included — it lives in `supabase/migrations/`.
- `backups/storage/` — full mirror of the Cloudflare **R2** `bird-images` bucket
  (all images, `originals/`, and `manifest.json`). R2 egress is free.

Backups are gitignored (they contain PII: `profiles`, `payment_events`). Off-site
durability goes to a second R2 bucket (planned). Weekly automation
(`.github/workflows/backup.yml`) is being reworked — do not rely on it yet.

## Restore the database

```bash
# 1. Apply schema to the target Supabase project
supabase db push            # or: psql "$DB_URL" -f supabase/migrations/*.sql

# 2. Import each table from NDJSON (one INSERT per row)
for f in backups/data/*.ndjson; do
  table=$(basename "$f" .ndjson)
  while IFS= read -r row; do
    jq -nr --arg t "$table" --argjson r "$row" '
      "INSERT INTO " + $t + " (" + ([$r | keys_unsorted | join(",")]|join("")) +
      ") VALUES (" + ([$r | to_entries | map(.value|@json) | join(",")]|join("")) +
      ") ON CONFLICT DO NOTHING;"
    '
  done < "$f" | psql "$DB_URL"
done
```

## Restore storage (R2)

Re-upload `backups/storage/` to the R2 `bird-images` bucket. Use `rclone` (an
R2/S3 remote) or extend the repo's R2 tooling (`src/lib/r2.ts` `r2Put`):

```bash
rclone copy backups/storage/ r2:bird-images/
```

If only `manifest.json` is corrupt, re-upload that single object.
