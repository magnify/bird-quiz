# Bird-quiz backup

Date: see archive filename.

## Contents

- `data/*.ndjson` — one file per public table, one JSON record per line.
  Schema is *not* included; restore against a fresh DB by replaying
  `supabase/migrations/*.sql` first, then loading these files.
- `storage/` — full mirror of the `bird-images` Supabase Storage bucket,
  including `originals/` and `manifest.json`.

## Restore (data)

```bash
# 1. Apply schema migrations to target DB
supabase db push   # or psql -f supabase/migrations/*.sql

# 2. Load each table (jq builds an INSERT per row)
for f in data/*.ndjson; do
  table=$(basename "$f" .ndjson)
  while IFS= read -r row; do
    jq -nr --arg t "$table" --argjson r "$row" '
      "INSERT INTO " + $t + " (" +
      ([$r | keys_unsorted | join(",")] | join("")) +
      ") VALUES (" +
      ([$r | to_entries | map(.value | @json) | join(",")] | join("")) +
      ") ON CONFLICT DO NOTHING;"
    '
  done < "$f" | psql "$DB_URL"
done
```

(For Fugle Quiz, `birds`, `bird_similarity_group`, `similarity_groups`,
`bird_images`, `quiz_sessions` are the only tables with data right now.)

## Restore (storage)

Re-upload the whole `storage/` directory tree to the `bird-images` bucket
via the Supabase dashboard (drag-and-drop) or the existing tooling:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  pnpm tsx scripts/upload-images-to-supabase.ts ./storage
```
