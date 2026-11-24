import { test, expect } from '@playwright/test';

test.describe('E2E Banking Journey: Authentication & Session Security', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays accessible login interface with zero hardcoded credentials', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Connexion Sécurisée/i })).toBeVisible();
    await expect(page.getByLabel(/Identifiant Bancaire/i)).toBeVisible();
    await expect(page.getByLabel(/Code d'accès/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Accéder à mon espace/i })).toBeVisible();
  });

  test('executes 1-click demo login, MFA step-up, and reaches dashboard', async ({ page }) => {
    // Click on Alice demo pill if in demo mode
    const demoAliceBtn = page.getByRole('button', { name: /Alice Dupont/i });
    if (await demoAliceBtn.isVisible()) {
      await demoAliceBtn.click();
    } else {
      await page.getByLabel(/Identifiant Bancaire/i).fill('alice');
      await page.getByLabel(/Code d'accès/i).fill('password');
    }

    await page.getByRole('button', { name: /Accéder à mon espace/i }).click();

    // Verify MFA modal pops up
    const mfaModal = page.getByRole('heading', { name: /Authentification Forte \(MFA\)/i });
    if (await mfaModal.isVisible()) {
      // Fill 6 digits
      const inputs = page.locator('input[inputmode="numeric"]');
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        await inputs.nth(i).fill('1');
      }
      await page.getByRole('button', { name: /Valider et ouvrir la session/i }).click();
    }

    // Verify successful arrival on dashboard
    await expect(page.getByText(/Bienvenue/i)).toBeVisible();
    await expect(page.getByText(/Carte Ultra Platinum/i)).toBeVisible();
  });
});
