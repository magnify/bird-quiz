import type { Page } from '@playwright/test'

export async function loginAsAdmin(page: Page): Promise<void> {
  const password = process.env.ADMIN_PASSWORD
  if (!password) throw new Error('ADMIN_PASSWORD env var is required for admin tests')

  await page.goto('/admin/birds')
  await page.getByPlaceholder('Adgangskode').fill(password)
  await page.getByRole('button', { name: /Log ind/i }).click()
  await page.waitForURL(/\/admin\/birds/, { timeout: 10_000 })
  await page.getByPlaceholder(/Søg fugle/i).waitFor({ timeout: 10_000 })
}
