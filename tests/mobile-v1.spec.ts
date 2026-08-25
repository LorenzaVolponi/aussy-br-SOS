import { expect, test } from '@playwright/test'

test.describe('Aussy V1 mobile', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: -25.4284, longitude: -49.2733 })
  })

  test('home renders critical actions without horizontal overflow', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('AUSSY', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Toque para emergência/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Abrir emergência SOS/i })).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1)
  })

  test('emergency route does not fabricate zero coordinates', async ({ page }) => {
    await page.goto('/?tab=emergency')
    await expect(page.getByText(/Emergência|SOS/i).first()).toBeVisible()
    const body = await page.locator('body').innerText()
    expect(body).not.toContain('0.0000°, 0.0000°')
  })

  test('QR location opens and stays usable on mobile viewport', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /QR localização/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('QR Code da localização')).toBeVisible()
    await expect(page.getByRole('button', { name: /Atualizar GPS/i })).toBeVisible()
  })

  test('bottom navigation remains reachable', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Início/i }).last()).toBeVisible()
    await expect(page.getByRole('button', { name: /^SOS$/i }).last()).toBeVisible()
    await expect(page.getByRole('button', { name: /Mapa/i }).last()).toBeVisible()
    await expect(page.getByRole('button', { name: /Alertas/i }).last()).toBeVisible()
    await expect(page.getByRole('button', { name: /Mais/i }).last()).toBeVisible()
  })
})
