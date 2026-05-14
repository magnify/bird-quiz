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

test('flag → unflag round trip via UI', async ({ page }) => {
  await openTestBirdModal(page)

  await page.getByRole('button', { name: /Markeret/i }).click()
  await page.getByRole('button', { name: 'Andet' }).click()

  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.flagged).toBe(true)
  expect((await readManifest())[TEST_BIRD]?.flag_reason).toBe('other')

  await page.getByRole('button', { name: /Markeret/i }).click()
  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.flagged ?? false).toBe(false)
})

test('credit edit via UI', async ({ page }) => {
  await openTestBirdModal(page)

  const newCredit = `e2e-${Date.now()}`
  await page.getByText('Test attribution', { exact: true }).click()
  const creditInput = page.getByPlaceholder('Navn eller kilde')
  await creditInput.fill(newCredit)
  await creditInput.press('Enter')

  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.attribution).toBe(newCredit)
})

test('license edit via UI', async ({ page }) => {
  await openTestBirdModal(page)

  await page.getByText('own', { exact: true }).click()
  const licenseInput = page.getByPlaceholder(/own, cc0, cc-by/)
  await licenseInput.fill('cc0')
  await licenseInput.press('Enter')

  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.license).toBe('cc0')
})

test('approve clears needsReview via UI', async ({ page }) => {
  await openTestBirdModal(page)

  await page.getByRole('button', { name: /Godkendt/i }).click()
  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.needsReview ?? false).toBe(false)
})

test('replace image via API endpoint then restore', async ({ request }) => {
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

test('crop image via API endpoint then restore', async ({ request }) => {
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

test('approve endpoint clears needsReview', async ({ request }) => {
  expect((await readManifest())[TEST_BIRD]?.needsReview).toBe(true)
  const res = await request.post('/api/admin/images/approve', { data: { scientificName: TEST_BIRD } })
  expect(res.ok()).toBeTruthy()
  await expect.poll(async () => (await readManifest())[TEST_BIRD]?.needsReview ?? false).toBe(false)

  const manifest = await readManifest()
  manifest[TEST_BIRD] = { ...BASELINE_MANIFEST_ENTRY }
  await writeManifest(manifest)
})
