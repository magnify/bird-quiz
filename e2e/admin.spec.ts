import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './fixtures/auth'
import {
  readManifest,
  writeManifest,
  readR2,
  resetTestBird,
  TEST_BIRD,
  TEST_BIRD_SLUG,
  BASELINE_MANIFEST_ENTRY,
} from './fixtures/r2'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ page }) => {
  await resetTestBird()
  await loginAsAdmin(page)
})

test.afterEach(async () => {
  await resetTestBird()
})

async function openTestBirdModal(page: import('@playwright/test').Page) {
  await page.getByPlaceholder(/Søg fugle/i).fill('Testus testus')
  await page.getByText('Testfugl', { exact: true }).click()
}

test('login + grid renders test bird', async ({ page }) => {
  await page.getByPlaceholder(/Søg fugle/i).fill('Testus')
  await expect(page.getByText('Testfugl', { exact: true })).toBeVisible()
})

test('flag bird via UI writes manifest', async ({ page }) => {
  await openTestBirdModal(page)

  await page.getByRole('button', { name: /Rediger metadata/i }).click()
  await page.getByLabel('Andet').check()
  await page.getByRole('button', { name: /^Gem$/ }).click()

  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.flagged).toBe(true)
  expect((await readManifest())[TEST_BIRD]?.flag_reason).toBe('other')
})

test('credit edit via UI', async ({ page }) => {
  await openTestBirdModal(page)

  const newCredit = `e2e-${Date.now()}`
  await page.getByRole('button', { name: /Rediger metadata/i }).click()
  await page.getByLabel('Kredit').fill(newCredit)
  await page.getByRole('button', { name: /^Gem$/ }).click()

  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.attribution).toBe(newCredit)
})

test('license edit via UI', async ({ page }) => {
  await openTestBirdModal(page)

  await page.getByRole('button', { name: /Rediger metadata/i }).click()
  await page.getByRole('textbox', { name: 'Licens', exact: true }).fill('cc0')
  await page.getByRole('button', { name: /^Gem$/ }).click()

  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.license).toBe('cc0')
})

test('replace image via API endpoint then restore', async ({ page }) => {
  const request = page.request
  const original = (await readR2(`originals/${TEST_BIRD_SLUG}.jpg`))!
  const tweaked = Buffer.from(original)
  tweaked[tweaked.length - 3] = (tweaked[tweaked.length - 3] + 1) & 0xff

  const replaceRes = await request.post('/api/admin/images/replace', {
    multipart: {
      scientificName: TEST_BIRD,
      file: { name: 'replace.jpg', mimeType: 'image/jpeg', buffer: tweaked },
    },
  })
  expect(replaceRes.ok(), `replace failed: ${replaceRes.status()} ${await replaceRes.text()}`).toBeTruthy()

  await expect
    .poll(async () => (await readR2(`${TEST_BIRD_SLUG}.jpg`))?.equals(tweaked) ?? false, { timeout: 10_000 })
    .toBe(true)

  const restoreRes = await request.post('/api/admin/images/restore', { data: { scientificName: TEST_BIRD } })
  expect(restoreRes.ok(), `restore failed: ${restoreRes.status()}`).toBeTruthy()

  await expect
    .poll(async () => (await readR2(`${TEST_BIRD_SLUG}.jpg`))?.equals(original) ?? false)
    .toBe(true)
})

test('crop image via API endpoint then restore', async ({ page }) => {
  const request = page.request
  const original = (await readR2(`originals/${TEST_BIRD_SLUG}.jpg`))!
  const tweaked = Buffer.from(original)
  tweaked[tweaked.length - 4] = (tweaked[tweaked.length - 4] + 1) & 0xff

  const cropRes = await request.post('/api/admin/images/crop', {
    multipart: {
      scientificName: TEST_BIRD,
      file: { name: 'crop.jpg', mimeType: 'image/jpeg', buffer: tweaked },
    },
  })
  expect(cropRes.ok(), `crop failed: ${cropRes.status()} ${await cropRes.text()}`).toBeTruthy()

  await expect
    .poll(async () => (await readR2(`${TEST_BIRD_SLUG}.jpg`))?.equals(tweaked) ?? false)
    .toBe(true)

  const restoreRes = await request.post('/api/admin/images/restore', { data: { scientificName: TEST_BIRD } })
  expect(restoreRes.ok()).toBeTruthy()

  await expect
    .poll(async () => (await readR2(`${TEST_BIRD_SLUG}.jpg`))?.equals(original) ?? false)
    .toBe(true)
})

test('approve endpoint clears needsReview', async ({ page }) => {
  const request = page.request
  expect((await readManifest())[TEST_BIRD]?.needsReview).toBe(true)
  const res = await request.post('/api/admin/images/approve', { data: { scientificName: TEST_BIRD } })
  expect(res.ok()).toBeTruthy()
  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.needsReview ?? false).toBe(false)

  const manifest = await readManifest()
  manifest[TEST_BIRD] = { ...BASELINE_MANIFEST_ENTRY }
  await writeManifest(manifest)
})

test('re-flag with different reason overwrites flag_reason', async ({ page }) => {
  await openTestBirdModal(page)

  await page.getByRole('button', { name: /Rediger metadata/i }).click()
  await page.getByLabel('Forkert art').check()
  await page.getByRole('button', { name: /^Gem$/ }).click()
  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.flag_reason).toBe('wrong-species')

  await page.getByRole('button', { name: /Rediger metadata/i }).click()
  await page.getByLabel('Dårlig komposition').check()
  await page.getByRole('button', { name: /^Gem$/ }).click()

  await expect.poll(async () => {
    const entry = (await readManifest())[TEST_BIRD]
    return { flagged: entry?.flagged, reason: entry?.flag_reason }
  }).toEqual({ flagged: true, reason: 'bad-crop' })
})

test('crop UI loads image and enables save button', async ({ page }) => {
  await openTestBirdModal(page)
  await page.getByRole('button', { name: /Beskær/i }).first().click()

  const cropImage = page.locator('.ReactCrop img').first()
  await expect(cropImage).toBeVisible({ timeout: 10_000 })
  await page.waitForFunction(
    () => {
      const img = document.querySelector('.ReactCrop img') as HTMLImageElement | null
      return !!img && img.naturalWidth > 0
    },
    null,
    { timeout: 10_000 },
  )

  const saveButton = page.getByRole('button', { name: /Beskær & gem/i })
  await expect(saveButton).toBeEnabled({ timeout: 5_000 })
})

test('crop end-to-end: cropping a region writes new image to R2', async ({ page }) => {
  await openTestBirdModal(page)
  await page.getByRole('button', { name: /Beskær/i }).first().click()

  const cropImage = page.locator('.ReactCrop img').first()
  await expect(cropImage).toBeVisible({ timeout: 10_000 })
  await page.waitForFunction(
    () => {
      const img = document.querySelector('.ReactCrop img') as HTMLImageElement | null
      return !!img && img.naturalWidth > 0 && img.complete
    },
    null,
    { timeout: 10_000 },
  )

  const originalBuffer = (await readR2(`${TEST_BIRD_SLUG}.jpg`))!

  const saveButton = page.getByRole('button', { name: /Beskær & gem/i })
  await expect(saveButton).toBeEnabled({ timeout: 5_000 })

  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await saveButton.click()

  await expect
    .poll(async () => {
      const buf = await readR2(`${TEST_BIRD_SLUG}.jpg`)
      return buf ? !buf.equals(originalBuffer) : false
    }, { timeout: 10_000 })
    .toBe(true)

  const corsErrors = consoleErrors.filter(e => /CORS|tainted|cross-origin/i.test(e))
  expect(corsErrors, `CORS errors in console: ${corsErrors.join(', ')}`).toEqual([])

  const restoreRes = await page.request.post('/api/admin/images/restore', { data: { scientificName: TEST_BIRD } })
  expect(restoreRes.ok()).toBeTruthy()
})

test('replace via Wikimedia UI changes the image', async ({ page }) => {
  await openTestBirdModal(page)
  const originalBuffer = (await readR2(`${TEST_BIRD_SLUG}.jpg`))!

  await page.getByRole('button', { name: /Erstat billede/i }).click()

  // Default tab is Wikimedia; wait for results to load
  const searchInput = page.getByPlaceholder(/Søg \(f\.eks\. artsnavn\)/i)
  await expect(searchInput).toBeVisible({ timeout: 10_000 })

  // Use a query that should return results
  await searchInput.fill('Parus major')
  await searchInput.press('Enter')

  // Wait for thumbnail grid and click the first thumbnail button.
  const firstThumb = page.locator('.grid > button').first()
  await expect(firstThumb).toBeVisible({ timeout: 15_000 })
  await firstThumb.scrollIntoViewIfNeeded()
  await firstThumb.click()

  // Now in the "selected" state with "Brug dette billede"
  const useButton = page.getByRole('button', { name: /Brug dette billede/i })
  await expect(useButton).toBeVisible()
  await useButton.click()

  // After success, modal swaps back to summary and R2 has new bytes
  await expect
    .poll(async () => {
      const buf = await readR2(`${TEST_BIRD_SLUG}.jpg`)
      return buf ? !buf.equals(originalBuffer) : false
    }, { timeout: 20_000 })
    .toBe(true)

  // Restore via API
  const restoreRes = await page.request.post('/api/admin/images/restore', { data: { scientificName: TEST_BIRD } })
  expect(restoreRes.ok()).toBeTruthy()
})

test('action row is gated by status: review shows all, approved shows only metadata', async ({ page }) => {
  // Baseline is needsReview: true → status is 'review'
  await openTestBirdModal(page)
  await expect(page.getByRole('button', { name: /Rediger metadata/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Erstat billede/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Beskær billede/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Markér som godkendt/i })).toBeVisible()

  // Approve via UI; status becomes 'approved'
  await page.getByRole('button', { name: /Markér som godkendt/i }).click()
  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.needsReview ?? false).toBe(false)

  // Approved view should only show "Rediger metadata"
  await expect(page.getByRole('button', { name: /Rediger metadata/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Erstat billede/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Beskær billede/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Markér som godkendt/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Fjern markering & godkend/i })).toHaveCount(0)

  // Restore baseline for next test
  const manifest = await readManifest()
  manifest[TEST_BIRD] = { ...BASELINE_MANIFEST_ENTRY }
  await writeManifest(manifest)
})

test('approve clears flagged + flag_reason in single call', async ({ page }) => {
  // Flag the bird first
  const manifest = await readManifest()
  manifest[TEST_BIRD] = { ...BASELINE_MANIFEST_ENTRY, flagged: true, flag_reason: 'bad-crop' }
  await writeManifest(manifest)

  const res = await page.request.post('/api/admin/images/approve', { data: { scientificName: TEST_BIRD } })
  expect(res.ok()).toBeTruthy()

  await expect.poll(async () => {
    const entry = (await readManifest())[TEST_BIRD]
    return { flagged: entry?.flagged ?? false, reason: entry?.flag_reason, needsReview: entry?.needsReview ?? false }
  }).toEqual({ flagged: false, reason: undefined, needsReview: false })

  const restored = await readManifest()
  restored[TEST_BIRD] = { ...BASELINE_MANIFEST_ENTRY }
  await writeManifest(restored)
})

test('replace dialog tabs stay visible when scrolling', async ({ page }) => {
  await openTestBirdModal(page)
  await page.getByRole('button', { name: /Erstat billede/i }).click()

  const tabBar = page.getByRole('button', { name: 'Wikimedia' }).first()
  await expect(tabBar).toBeVisible()
  const before = await tabBar.boundingBox()
  expect(before).not.toBeNull()

  await page.mouse.wheel(0, 800)
  await page.waitForTimeout(200)

  const after = await tabBar.boundingBox()
  expect(after).not.toBeNull()
  expect(after!.y).toBeLessThanOrEqual(before!.y + 5)
})
