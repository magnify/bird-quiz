#!/usr/bin/env tsx

/**
 * Image Copyright Audit Tool
 *
 * Analyzes the bird-images manifest.json from Supabase Storage to identify
 * copyright compliance issues across all 221 bird images.
 *
 * Usage:
 *   pnpm audit:copyright              # Console report
 *   pnpm audit:copyright --format=csv # CSV export
 *   pnpm audit:copyright --format=html # HTML export
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local explicitly (Next.js doesn't load it for scripts)
config({ path: resolve(process.cwd(), '.env.local') })

import { createServiceClient } from '../src/lib/supabase/server'
import { STATIC_BIRDS } from '../src/lib/data/birds-static'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

interface ManifestEntry {
  source: string
  license?: string
  attribution?: string
  lastUpdated?: string
  needsReview?: boolean
}

interface AuditResult {
  scientificName: string
  nameDa: string
  status: 'critical' | 'warning' | 'ok'
  source: string
  license?: string
  attribution?: string
  issues: string[]
  recommendations: string[]
}

async function downloadManifest(): Promise<Record<string, ManifestEntry>> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.storage
    .from('bird-images')
    .download('manifest.json')

  if (error || !data) {
    throw new Error(`Failed to download manifest: ${error?.message || 'Unknown error'}`)
  }

  const text = await data.text()
  return JSON.parse(text)
}

function analyzeEntry(
  scientificName: string,
  entry: ManifestEntry,
  bird?: { name_da: string }
): AuditResult {
  const issues: string[] = []
  const recommendations: string[] = []

  // Missing attribution
  if (!entry.attribution || entry.attribution.trim() === '') {
    issues.push('Missing attribution')
    const encodedName = encodeURIComponent(scientificName)
    recommendations.push(
      `Search iNaturalist: https://www.inaturalist.org/observations?taxon_name=${encodedName}`
    )
  }

  // Unclear source
  if (entry.source === 'cached' || entry.source === 'unknown' || !entry.source) {
    issues.push('Unclear source (cached/unknown)')
    recommendations.push('Document original source or replace with properly attributed image')
  }

  // Needs manual review
  if (entry.needsReview === true) {
    issues.push('Needs manual review (auto-replaced)')
    recommendations.push('Review image quality, species accuracy, and suitability for Danish bird quiz')
  }

  // Check license (skip checks for project-owned images)
  const isOwn = entry.license?.toLowerCase() === 'own' || entry.license?.toLowerCase() === 'project'

  if (!isOwn) {
    // Non-commercial license
    if (entry.license?.toLowerCase().includes('nc')) {
      issues.push('Non-commercial license (blocks commercial use)')
      recommendations.push('Replace with CC-BY or CC0 licensed image')
    }

    // Copyright symbol without CC license
    if (entry.attribution?.match(/©|\(c\)/i) && !entry.license?.toLowerCase().startsWith('cc-')) {
      issues.push('Copyright symbol without CC license')
      recommendations.push('Verify license status and document CC license if available')
    }

    // Missing license field
    if (entry.attribution && (!entry.license || entry.license.trim() === '')) {
      issues.push('Attribution present but license field missing')
      recommendations.push('Add explicit license field (cc-by, cc0, etc.)')
    }
  }

  // Determine status
  const criticalIssues = issues.filter(i =>
    i.includes('Missing attribution') ||
    i.includes('Non-commercial') ||
    i.includes('Unclear source')
  )

  // needsReview is a warning, not OK
  const needsReviewIssues = issues.filter(i => i.includes('Needs manual review'))

  const status = issues.length === 0 ? 'ok' : criticalIssues.length > 0 ? 'critical' : 'warning'

  return {
    scientificName,
    nameDa: bird?.name_da || scientificName,
    status,
    source: entry.source || 'unknown',
    license: entry.license,
    attribution: entry.attribution,
    issues,
    recommendations,
  }
}

function generateConsoleReport(results: AuditResult[]) {
  const criticalCount = results.filter(r => r.status === 'critical').length
  const warningCount = results.filter(r => r.status === 'warning').length
  const okCount = results.filter(r => r.status === 'ok').length

  console.log('\n╔════════════════════════════════════════════════════════════════════╗')
  console.log('║           BIRD IMAGE COPYRIGHT AUDIT REPORT                       ║')
  console.log('╚════════════════════════════════════════════════════════════════════╝\n')

  // Sort: critical first, then warning, then ok
  const sorted = results.sort((a, b) => {
    const order = { critical: 0, warning: 1, ok: 2 }
    return order[a.status] - order[b.status]
  })

  // Show first 20 issues
  const display = sorted.slice(0, 20)

  console.log('┌─────────────────────────────┬──────────┬──────────┬──────────┐')
  console.log('│ Scientific Name             │ Status   │ Source   │ License  │')
  console.log('├─────────────────────────────┼──────────┼──────────┼──────────┤')

  display.forEach((result) => {
    const status = result.status.toUpperCase().padEnd(8)
    const statusColor =
      result.status === 'critical' ? '\x1b[31m' : result.status === 'warning' ? '\x1b[33m' : '\x1b[32m'
    const reset = '\x1b[0m'

    const name = result.scientificName.padEnd(27).slice(0, 27)
    const source = (result.source || '-').padEnd(8).slice(0, 8)
    const license = (result.license || '-').padEnd(8).slice(0, 8)

    console.log(`│ ${name} │ ${statusColor}${status}${reset} │ ${source} │ ${license} │`)
  })

  console.log('└─────────────────────────────┴──────────┴──────────┴──────────┘\n')

  if (results.length > 20) {
    console.log(`Showing 20 of ${results.length} total results.\n`)
  }

  // Summary
  const criticalPct = ((criticalCount / results.length) * 100).toFixed(1)
  const warningPct = ((warningCount / results.length) * 100).toFixed(1)
  const okPct = ((okCount / results.length) * 100).toFixed(1)

  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log(`Total:    ${results.length}`)
  console.log(`\x1b[31mCritical: ${criticalCount} (${criticalPct}%)\x1b[0m`)
  console.log(`\x1b[33mWarning:  ${warningCount} (${warningPct}%)\x1b[0m`)
  console.log(`\x1b[32mOK:       ${okCount} (${okPct}%)\x1b[0m`)
  console.log('═══════════════════════════════════════════════════════════════════\n')

  // Sample critical issues
  const criticalSamples = sorted.filter(r => r.status === 'critical').slice(0, 5)
  if (criticalSamples.length > 0) {
    console.log('CRITICAL ISSUES (Sample):')
    criticalSamples.forEach((result) => {
      console.log(`\n• ${result.nameDa} (${result.scientificName})`)
      result.issues.forEach(issue => console.log(`  ⚠ ${issue}`))
      if (result.recommendations.length > 0) {
        console.log(`  → ${result.recommendations[0]}`)
      }
    })
    console.log('')
  }
}

function generateCSV(results: AuditResult[], outputDir: string) {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `copyright-audit-${timestamp}.csv`
  const filepath = join(outputDir, filename)

  const headers = [
    'scientific_name',
    'name_da',
    'status',
    'source',
    'license',
    'attribution',
    'issues',
    'recommendations',
  ]

  const rows = results.map(r => [
    r.scientificName,
    r.nameDa,
    r.status,
    r.source,
    r.license || '',
    (r.attribution || '').replace(/"/g, '""'), // Escape quotes
    r.issues.join('; '),
    r.recommendations.join('; '),
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n')

  writeFileSync(filepath, csv, 'utf-8')
  console.log(`\n✓ CSV report saved to: ${filepath}`)
}

function generateHTML(results: AuditResult[], outputDir: string) {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `copyright-audit-${timestamp}.html`
  const filepath = join(outputDir, filename)

  const criticalCount = results.filter(r => r.status === 'critical').length
  const warningCount = results.filter(r => r.status === 'warning').length
  const okCount = results.filter(r => r.status === 'ok').length

  const sorted = results.sort((a, b) => {
    const order = { critical: 0, warning: 1, ok: 2 }
    return order[a.status] - order[b.status]
  })

  const rows = sorted
    .map(
      r => `
    <tr class="${r.status}">
      <td>${r.scientificName}</td>
      <td>${r.nameDa}</td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td>${r.source}</td>
      <td>${r.license || '-'}</td>
      <td>${r.attribution || '-'}</td>
      <td>${r.issues.join(', ') || '-'}</td>
      <td>${r.recommendations.map(rec => `<div>${rec}</div>`).join('') || '-'}</td>
    </tr>
  `
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bird Image Copyright Audit - ${timestamp}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      margin-top: 0;
      color: #333;
    }
    .summary {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat {
      flex: 1;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
    }
    .stat.critical { background: #fee; border: 2px solid #c33; }
    .stat.warning { background: #ffc; border: 2px solid #c93; }
    .stat.ok { background: #efe; border: 2px solid #3c3; }
    .stat .number { font-size: 32px; font-weight: bold; margin-bottom: 5px; }
    .stat .label { font-size: 14px; color: #666; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f9f9f9;
      font-weight: 600;
      position: sticky;
      top: 0;
    }
    tr:hover {
      background: #f9f9f9;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge.critical { background: #c33; color: white; }
    .badge.warning { background: #c93; color: white; }
    .badge.ok { background: #3c3; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Bird Image Copyright Audit Report</h1>
    <p>Generated: ${new Date().toLocaleDateString('da-DK', { dateStyle: 'long' })}</p>

    <div class="summary">
      <div class="stat critical">
        <div class="number">${criticalCount}</div>
        <div class="label">Critical</div>
      </div>
      <div class="stat warning">
        <div class="number">${warningCount}</div>
        <div class="label">Warning</div>
      </div>
      <div class="stat ok">
        <div class="number">${okCount}</div>
        <div class="label">OK</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Scientific Name</th>
          <th>Danish Name</th>
          <th>Status</th>
          <th>Source</th>
          <th>License</th>
          <th>Attribution</th>
          <th>Issues</th>
          <th>Recommendations</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</body>
</html>`

  writeFileSync(filepath, html, 'utf-8')
  console.log(`✓ HTML report saved to: ${filepath}`)
}

async function main() {
  const args = process.argv.slice(2)
  const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'console'

  console.log('Downloading manifest.json from Supabase Storage...')
  const manifest = await downloadManifest()

  console.log('Loading bird names from birds-static.ts...')
  const birds = STATIC_BIRDS

  console.log(`Analyzing ${Object.keys(manifest).length} entries...\n`)
  const results: AuditResult[] = []

  for (const [scientificName, entry] of Object.entries(manifest)) {
    const bird = birds.find(b => b.scientific_name === scientificName)
    const result = analyzeEntry(scientificName, entry, bird)
    results.push(result)
  }

  // Ensure reports directory exists
  const reportsDir = join(process.cwd(), 'reports')
  mkdirSync(reportsDir, { recursive: true })

  // Generate reports
  switch (format) {
    case 'csv':
      generateConsoleReport(results)
      generateCSV(results, reportsDir)
      break
    case 'html':
      generateConsoleReport(results)
      generateHTML(results, reportsDir)
      break
    case 'all':
      generateConsoleReport(results)
      generateCSV(results, reportsDir)
      generateHTML(results, reportsDir)
      break
    default:
      generateConsoleReport(results)
  }
}

main().catch(err => {
  console.error('Error running audit:', err)
  process.exit(1)
})
