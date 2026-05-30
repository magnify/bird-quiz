#!/usr/bin/env node
// Mechanical fence against design-system drift.
// Counts violations per category per file, compares to frozen baseline,
// exits non-zero on any regression. Baseline is monotone-decreasing.
//
// Usage:
//   node scripts/lint-design.mjs                # check
//   node scripts/lint-design.mjs --update       # re-freeze baseline (only lower)
//   node scripts/lint-design.mjs --update --force  # force-overwrite even if higher
//   node scripts/lint-design.mjs --list         # show current counts, no diff

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BASELINE_PATH = join(ROOT, '.claude/design-lint-baseline.json')

const args = process.argv.slice(2)
const UPDATE = args.includes('--update') || args.includes('--update-baseline')
const FORCE = args.includes('--force')
const LIST = args.includes('--list')

// ---- Rules ---------------------------------------------------------------

const TAILWIND_COLORS = [
  'red','green','blue','yellow','orange','purple','pink','cyan','lime',
  'amber','emerald','teal','sky','indigo','violet','fuchsia','rose',
  'slate','gray','zinc','stone','neutral',
]
const TAILWIND_COLOR_RE = new RegExp(
  `\\b(bg|text|border|ring|from|to|via|outline|decoration|divide|placeholder|accent|caret|fill|stroke)-(${TAILWIND_COLORS.join('|')})-\\d`,
  'g',
)

const INLINE_STYLE_RE = /style=\{\{/g
const DYNAMIC_MARKER = /\/\*\s*dynamic\s*\*\//
const DEFAULT_EXPORT_RE = /^export default function\s+\w+/gm
const BROWSER_DIALOG_RE = /\b(alert|confirm|prompt)\s*\(/g
const HEX_COLOR_RE = /#[0-9a-fA-F]{3,8}\b/g
const HARDCODED_PX_RE = /\b\d+px\b/g
const RAW_RGBA_RE = /\brgba?\s*\(/g

// Categories: [name, { roots: [globs], test: (file, src) => count }]
const RULES = [
  {
    name: 'tailwind-color-utility',
    roots: ['src/components'],
    exts: ['.tsx', '.ts', '.jsx', '.js'],
    test: (_f, src) => (src.match(TAILWIND_COLOR_RE) || []).length,
  },
  {
    name: 'inline-style',
    roots: ['src/components'],
    exts: ['.tsx', '.jsx'],
    // Count each `style={{` occurrence unless the line has a /* dynamic */ marker.
    test: (_f, src) => {
      let count = 0
      for (const line of src.split('\n')) {
        if (!INLINE_STYLE_RE.test(line)) { INLINE_STYLE_RE.lastIndex = 0; continue }
        INLINE_STYLE_RE.lastIndex = 0
        if (DYNAMIC_MARKER.test(line)) continue
        const hits = (line.match(INLINE_STYLE_RE) || []).length
        count += hits
      }
      return count
    },
  },
  {
    name: 'default-export-component',
    roots: ['src/components'],
    exts: ['.tsx'],
    test: (_f, src) => (src.match(DEFAULT_EXPORT_RE) || []).length,
  },
  {
    name: 'browser-dialog',
    roots: ['src'],
    exts: ['.ts', '.tsx', '.js', '.jsx'],
    excludeDirs: ['src/app'],
    test: (_f, src) => (src.match(BROWSER_DIALOG_RE) || []).length,
  },
  {
    // Catches raw hex color literals in quiz components — use --quiz-* tokens instead.
    name: 'hex-color',
    roots: ['src/components/quiz'],
    exts: ['.tsx', '.jsx'],
    test: (_f, src) => {
      let count = 0
      for (const line of src.split('\n')) {
        const m = line.match(HEX_COLOR_RE)
        if (m) count += m.length
      }
      return count
    },
  },
  {
    // Catches hardcoded px values in quiz components — use --quiz-gap-* / --quiz-padding-* tokens.
    name: 'hardcoded-px',
    roots: ['src/components/quiz'],
    exts: ['.tsx', '.jsx'],
    test: (_f, src) => {
      let count = 0
      for (const line of src.split('\n')) {
        if (/@media/.test(line)) continue
        const m = line.match(HARDCODED_PX_RE)
        if (m) count += m.length
      }
      return count
    },
  },
  {
    // Catches raw rgba() calls in quiz components — use --quiz-* tokens instead.
    name: 'raw-rgba',
    roots: ['src/components/quiz'],
    exts: ['.tsx', '.jsx'],
    test: (_f, src) => {
      let count = 0
      for (const line of src.split('\n')) {
        const m = line.match(RAW_RGBA_RE)
        if (m) count += m.length
      }
      return count
    },
  },
]

// ---- Walker --------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.git', 'legacy', 'public'])

function walk(dir, acc = []) {
  let entries
  try { entries = readdirSync(dir) } catch { return acc }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, acc)
    else acc.push(full)
  }
  return acc
}

function collect() {
  const current = {}
  for (const rule of RULES) {
    current[rule.name] = {}
    for (const root of rule.roots) {
      const abs = join(ROOT, root)
      if (!existsSync(abs)) continue
      for (const file of walk(abs)) {
        const rel = relative(ROOT, file)
        if (rule.excludeDirs?.some(d => rel.startsWith(d + '/'))) continue
        if (!rule.exts.some(ext => file.endsWith(ext))) continue
        const src = readFileSync(file, 'utf8')
        const count = rule.test(file, src)
        if (count > 0) current[rule.name][rel] = count
      }
    }
  }
  return current
}

// ---- Baseline compare ----------------------------------------------------

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
}

function saveBaseline(data) {
  mkdirSync(dirname(BASELINE_PATH), { recursive: true })
  writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + '\n')
}

function diffCounts(baseline, current) {
  const regressions = []
  const improvements = []
  for (const rule of RULES) {
    const base = baseline[rule.name] || {}
    const cur = current[rule.name] || {}
    const files = new Set([...Object.keys(base), ...Object.keys(cur)])
    for (const f of files) {
      const b = base[f] || 0
      const c = cur[f] || 0
      if (c > b) regressions.push({ rule: rule.name, file: f, baseline: b, current: c })
      else if (c < b) improvements.push({ rule: rule.name, file: f, baseline: b, current: c })
    }
  }
  return { regressions, improvements }
}

function totals(counts) {
  const out = {}
  for (const [rule, files] of Object.entries(counts)) {
    out[rule] = Object.values(files).reduce((a, b) => a + b, 0)
  }
  return out
}

// ---- Main ----------------------------------------------------------------

const current = collect()

if (LIST) {
  console.log('Current violations:\n')
  for (const [rule, files] of Object.entries(current)) {
    const total = Object.values(files).reduce((a, b) => a + b, 0)
    console.log(`  ${rule}: ${total}`)
    for (const [f, c] of Object.entries(files).sort(([,a],[,b]) => b - a)) {
      console.log(`    ${c.toString().padStart(4)}  ${f}`)
    }
  }
  process.exit(0)
}

if (UPDATE) {
  const existing = loadBaseline()
  if (existing && !FORCE) {
    // Monotone-decreasing: only accept lower counts.
    const { regressions } = diffCounts(existing, current)
    if (regressions.length > 0) {
      console.error('Refusing to raise baseline. Regressions:')
      for (const r of regressions) {
        console.error(`  [${r.rule}] ${r.file}: ${r.baseline} -> ${r.current}`)
      }
      console.error('\nFix them, or pass --force to overwrite anyway.')
      process.exit(1)
    }
  }
  saveBaseline(current)
  console.log(`Baseline written: ${relative(ROOT, BASELINE_PATH)}`)
  console.log('Totals:', totals(current))
  process.exit(0)
}

const baseline = loadBaseline()
if (!baseline) {
  console.error(`No baseline at ${relative(ROOT, BASELINE_PATH)}`)
  console.error('Run: node scripts/lint-design.mjs --update')
  process.exit(1)
}

const { regressions, improvements } = diffCounts(baseline, current)

if (improvements.length > 0) {
  console.log(`Improvements (${improvements.length}) — run --update to lock in:`)
  for (const i of improvements) {
    console.log(`  [${i.rule}] ${i.file}: ${i.baseline} -> ${i.current}`)
  }
  console.log()
}

if (regressions.length > 0) {
  console.error(`Regressions (${regressions.length}):`)
  for (const r of regressions) {
    console.error(`  [${r.rule}] ${r.file}: ${r.baseline} -> ${r.current}`)
  }
  console.error('\nFix them, or update baseline with a justification.')
  process.exit(1)
}

console.log('OK — no regressions. Totals:', totals(current))
