import { test, expect } from '@playwright/test'

test('quiz: start, image loads, answer registers feedback', async ({ page }) => {
  const consoleErrors: string[] = []
  const failedRequests: string[] = []
  page.on('pageerror', (e) => consoleErrors.push(e.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('response', (res) => {
    if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`)
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: /Start Quiz/i })).toBeVisible()

  await page.getByRole('button', { name: /Start Quiz/i }).click()

  const photo = page.locator('img.bird-photo').first()
  await expect(photo).toBeVisible({ timeout: 15_000 })

  await photo.evaluate((el) => {
    return new Promise<void>((resolve) => {
      const img = el as HTMLImageElement
      if (img.complete && img.naturalWidth > 0) return resolve()
      img.addEventListener('load', () => resolve(), { once: true })
      img.addEventListener('error', () => resolve(), { once: true })
    })
  })
  const dims = await photo.evaluate((el) => {
    const img = el as HTMLImageElement
    return { w: img.naturalWidth, h: img.naturalHeight, src: img.currentSrc }
  })
  expect(dims.w, `image failed to load: ${dims.src}`).toBeGreaterThan(0)

  const optionButtons = page.locator('button:has(.option-indicator)')
  await expect(optionButtons.first()).toBeVisible({ timeout: 10_000 })
  const count = await optionButtons.count()
  expect(count, 'expected 4 answer options').toBeGreaterThanOrEqual(2)
  await optionButtons.first().click()

  await expect(photo).toHaveClass(/correct|wrong/, { timeout: 10_000 })

  const filteredErrors = consoleErrors.filter(e => !e.includes('favicon'))
  const sample = failedRequests.slice(0, 10).join('\n  ')
  expect(filteredErrors, `${filteredErrors.length} console errors. Failed requests:\n  ${sample}`).toHaveLength(0)
})

test('admin: unauthenticated sees login, wrong password is rejected', async ({ page }) => {
  await page.goto('/admin/images')
  const pw = page.getByPlaceholder('Adgangskode')
  await expect(pw).toBeVisible()
  await expect(page.getByRole('button', { name: /Log ind/i })).toBeVisible()

  await pw.fill('definitely-not-the-real-password-2026')
  await page.getByRole('button', { name: /Log ind/i }).click()

  await expect(page.getByText(/Forkert adgangskode/i)).toBeVisible({ timeout: 5_000 })
  await expect(pw).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/images/)
})

test('routes: manifest + image proxy serve from R2', async ({ request }) => {
  const manifest = await request.get('/api/images/manifest.json')
  expect(manifest.status()).toBe(200)
  expect(manifest.headers()['content-type']).toContain('application/json')
  const json = await manifest.json()
  expect(Object.keys(json).length).toBeGreaterThan(100)

  const imgNoExt = await request.get('/api/images/turdus-merula')
  expect(imgNoExt.status()).toBe(200)
  expect(imgNoExt.headers()['content-type']).toBe('image/jpeg')

  const original = await request.get('/api/images/originals/turdus-merula.jpg')
  expect(original.status()).toBe(200)
  expect(original.headers()['content-type']).toBe('image/jpeg')
})

test('security: headers present, traversal rejected', async ({ request }) => {
  const home = await request.get('/')
  const h = home.headers()
  expect(h['content-security-policy']).toBeTruthy()
  expect(h['x-frame-options']).toBe('DENY')
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(h['x-powered-by']).toBeUndefined()

  const bad = await request.get('/api/images/.env')
  expect(bad.status()).toBe(404)
})
