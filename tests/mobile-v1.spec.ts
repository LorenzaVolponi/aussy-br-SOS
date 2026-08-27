import { expect, test, type Page } from '@playwright/test'

const MOBILE_DESTINATIONS = [
  ['home', 'Início'],
  ['clima', 'Clima e alertas'],
  ['mapa', 'Mapa e rede'],
  ['defesa', 'Defesa Civil'],
  ['natureza', 'Rios e natureza'],
  ['satellites', 'Satélites'],
  ['sensores', 'Sensores'],
  ['tools', 'Ferramentas'],
] as const

function watchHydrationErrors(page: Page) {
  const errors: string[] = []

  page.on('pageerror', (error) => {
    if (/React error #418|hydration failed|hydration mismatch/i.test(error.message)) {
      errors.push(error.message)
    }
  })

  return errors
}

test.describe('Aussy V1 mobile', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: -25.4284, longitude: -49.2733 })
  })

  test('home renders without hydration mismatch or horizontal page overflow', async ({ page }) => {
    const hydrationErrors = watchHydrationErrors(page)

    await page.goto('/')
    await expect(page.getByRole('button', { name: /Ir para o início do Aussy/i })).toBeVisible()
    await expect(page.getByText('Ações rápidas', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /^SOS$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Ver todos os recursos/i })).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1)

    await expect.poll(() => hydrationErrors, {
      message: 'O primeiro render mobile não pode divergir entre servidor e navegador',
      timeout: 1_000,
    }).toEqual([])
  })

  test('emergency route does not fabricate zero coordinates', async ({ page }) => {
    await page.goto('/?tab=emergency')
    await expect(page.getByText(/Emergência|SOS/i).first()).toBeVisible()
    const body = await page.locator('body').innerText()
    expect(body).not.toContain('0.0000°, 0.0000°')
  })

  test('location sharing QR opens and stays usable on mobile viewport', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Compartilhar localização/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('QR Code da localização')).toBeVisible()
    await expect(page.getByRole('button', { name: /Atualizar GPS/i })).toBeVisible()
  })

  test('bottom navigation exposes every module directly without a menu detour', async ({ page }) => {
    await page.goto('/')

    const navigation = page.getByRole('navigation', { name: 'Navegação principal' })
    await expect(navigation.getByRole('button', { name: /^SOS$/i })).toBeVisible()

    for (const [key, label] of MOBILE_DESTINATIONS) {
      const destination = navigation.locator(`[data-mobile-tab="${key}"]`)
      await expect(destination).toHaveCount(1)
      await expect(destination).toHaveAttribute('aria-label', label)
    }

    await expect(navigation.getByRole('button', { name: /^Menu$/i })).toHaveCount(0)
  })

  test('direct tools navigation opens the real LED control', async ({ page }) => {
    await page.goto('/')

    const navigation = page.getByRole('navigation', { name: 'Navegação principal' })
    const tools = navigation.locator('[data-mobile-tab="tools"]')
    await expect(tools).toBeAttached()
    await tools.click()

    await expect(page).toHaveURL(/\?tab=tools$/)
    await expect(page.getByText('Lanterna LED real', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Acender LED traseiro/i })).toBeVisible()
  })

  test('map route presents location provenance and GPS refresh', async ({ page }) => {
    await page.goto('/?tab=mapa')
    await expect(page.getByText('Localização do aparelho', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Atualizar GPS/i }).first()).toBeVisible()
    await expect(page.getByText(/GPS DO APARELHO|BUSCANDO|PENDENTE/).first()).toBeVisible()
  })

  test('full module sheet remains available from the home command dashboard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Ver todos os recursos/i }).click()
    await expect(page.getByText(/Menu rápido AUSSY/)).toBeVisible()
    await expect(page.getByText('Essencial', { exact: true })).toBeVisible()
    await expect(page.getByText('Explorar', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Rios e natureza/i })).toBeVisible()
  })
})
