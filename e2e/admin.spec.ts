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

  await page.getByRole('button', { name: /Markeret/i }).click()
  await page.getByRole('button', { name: 'Andet' }).click()

  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.flagged).toBe(true)
  expect((await readManifest())[TEST_BIRD]?.flag_reason).toBe('other')
})

test('credit edit via UI', async ({ page }) => {
  await openTestBirdModal(page)

  const newCredit = `e2e-${Date.now()}`
  await page.getByRole('button', { name: /Rediger kredit & licens/i }).click()
  await page.getByLabel('Kredit').fill(newCredit)
  await page.getByRole('button', { name: /^Gem$/ }).click()

  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.attribution).toBe(newCredit)
})

test('license edit via UI', async ({ page }) => {
  await openTestBirdModal(page)

  await page.getByRole('button', { name: /Rediger kredit & licens/i }).click()
  await page.getByLabel('Licens').fill('cc0')
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

  await page.getByRole('button', { name: /Markeret/i }).click()
  await page.getByRole('button', { name: 'Forkert art' }).click()
  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.flag_reason).toBe('wrong-species')

  await page.getByRole('button', { name: /Markeret/i }).click()
  await page.getByRole('button', { name: 'Dårlig komposition' }).click()

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
