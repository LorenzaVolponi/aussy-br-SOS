import { expect, test } from '@playwright/test'

test.describe('Aussy V1 mobile', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: -25.4284, longitude: -49.2733 })
  })

  test('home renders the command interface without horizontal overflow', async ({ page }) => {
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

    for (const name of [
      'Início',
      'Clima e alertas',
      'Mapa e rede',
      'Defesa Civil',
      'Rios e natureza',
      'Satélites',
      'Sensores',
      'Ferramentas',
    ]) {
      const destination = navigation.getByRole('button', { name })
      await destination.scrollIntoViewIfNeeded()
      await expect(destination).toBeVisible()
    }

    await expect(navigation.getByRole('button', { name: /^Menu$/i })).toHaveCount(0)
  })

  test('direct tools navigation opens the real LED control', async ({ page }) => {
    await page.goto('/')

    const navigation = page.getByRole('navigation', { name: 'Navegação principal' })
    const tools = navigation.getByRole('button', { name: 'Ferramentas' })
    await tools.scrollIntoViewIfNeeded()
    await tools.click()

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
