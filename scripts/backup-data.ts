#!/usr/bin/env tsx

/**
 * Data-level backup via PostgREST
 *
 * Discovers every table exposed by Supabase's REST API (using its OpenAPI
 * spec) and dumps each one to `backups/data/{table}.ndjson` (one JSON
 * record per line).
 *
 * Schema (DDL, indexes, RLS, functions) is NOT included — that lives in
 * `supabase/migrations/`. Restore = run migrations, then import these files.
 *
 * Required env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL),
 *               SUPABASE_SERVICE_ROLE_KEY
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const OUT_DIR = join(process.cwd(), 'backups', 'data')
const PAGE = 1000
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
}

async function discoverTables(): Promise<string[]> {
  // PostgREST exposes an OpenAPI 2.0 spec at the root of /rest/v1/
  const res = await fetch(`${URL}/rest/v1/`, { headers })
  if (!res.ok) throw new Error(`OpenAPI fetch ${res.status} ${res.statusText}`)
  const spec = await res.json() as { paths?: Record<string, unknown>; definitions?: Record<string, unknown> }

  // Tables appear as top-level paths like "/birds". Filter out the root and rpc/.
  const fromPaths = Object.keys(spec.paths ?? {})
    .filter(p => p.startsWith('/') && p !== '/' && !p.startsWith('/rpc/'))
    .map(p => p.slice(1))
  // Belt and suspenders — also pick up names from `definitions` and intersect.
  const fromDefs = Object.keys(spec.definitions ?? {})
  const set = new Set(fromPaths.filter(t => fromDefs.includes(t)))
  return [...set].sort()
}

async function dumpTable(table: string): Promise<{ rows: number; bytes: number }> {
  const lines: string[] = []
  let offset = 0
  let total = 0
  while (true) {
    const res = await fetch(`${URL}/rest/v1/${table}?select=*&order=id.asc.nullslast`, {
      headers: {
        ...headers,
        Range: `${offset}-${offset + PAGE - 1}`,
        // Without this header PostgREST returns just the page; we want exact-count for sanity.
        Prefer: 'count=exact',
      },
    })
    // Some tables don't have an `id` column → retry without ordering.
    if (res.status === 400) {
      const fallback = await fetch(`${URL}/rest/v1/${table}?select=*`, {
        headers: { ...headers, Range: `${offset}-${offset + PAGE - 1}` },
      })
      if (!fallback.ok) throw new Error(`${table}: ${fallback.status}`)
      const rows = await fallback.json() as unknown[]
      for (const row of rows) lines.push(JSON.stringify(row))
      total += rows.length
      if (rows.length < PAGE) break
      offset += PAGE
      continue
    }
    if (!res.ok && res.status !== 206) throw new Error(`${table}: ${res.status} ${res.statusText}`)
    const rows = await res.json() as unknown[]
    for (const row of rows) lines.push(JSON.stringify(row))
    total += rows.length
    if (rows.length < PAGE) break
    offset += PAGE
  }
  const dest = join(OUT_DIR, `${table}.ndjson`)
  const body = lines.join('\n') + (lines.length > 0 ? '\n' : '')
  await writeFile(dest, body, 'utf8')
  return { rows: total, bytes: Buffer.byteLength(body, 'utf8') }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  console.log('Discovering tables…')
  const tables = await discoverTables()
  console.log(`Found ${tables.length} tables: ${tables.join(', ')}`)

  const summary: Array<{ table: string; rows: number; bytes: number; ok: boolean; error?: string }> = []
  for (const table of tables) {
    process.stdout.write(`  ${table}… `)
    try {
      const { rows, bytes } = await dumpTable(table)
      console.log(`${rows} rows (${(bytes / 1024).toFixed(1)} KB)`)
      summary.push({ table, rows, bytes, ok: true })
    } catch (err) {
      console.log(`FAIL: ${(err as Error).message}`)
      summary.push({ table, rows: 0, bytes: 0, ok: false, error: (err as Error).message })
    }
  }

  const totalRows = summary.reduce((s, x) => s + x.rows, 0)
  const totalBytes = summary.reduce((s, x) => s + x.bytes, 0)
  const failed = summary.filter(x => !x.ok)
  console.log(`\nDone. ${totalRows} rows across ${summary.length} tables, ${(totalBytes / 1024).toFixed(1)} KB total.`)
  if (failed.length) {
    console.log(`Failed: ${failed.map(f => f.table).join(', ')}`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
