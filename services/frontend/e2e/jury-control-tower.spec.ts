import { test, expect } from '@playwright/test';

test.describe('E2E DevSecOps Journey: Mode Jury / Control Tower', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Login as Admin
    const demoAdminBtn = page.getByRole('button', { name: /Admin Ops/i });
    if (await demoAdminBtn.isVisible()) {
      await demoAdminBtn.click();
    } else {
      await page.getByLabel(/Identifiant Bancaire/i).fill('admin');
      await page.getByLabel(/Code d'accès/i).fill('password');
    }
    await page.getByRole('button', { name: /Accéder à mon espace/i }).click();

    const mfaInputs = page.locator('input[inputmode="numeric"]');
    if (await mfaInputs.first().isVisible()) {
      const count = await mfaInputs.count();
      for (let i = 0; i < count; i++) {
        await mfaInputs.nth(i).fill('1');
      }
      await page.getByRole('button', { name: /Valider et ouvrir la session/i }).click();
    }
  });

  test('opens Mode Jury Control Tower and executes Canary Rollback scenario', async ({ page }) => {
    // Open Mode Jury via header button
    const modeJuryBtn = page.getByRole('button', { name: /Mode Jury/i });
    await expect(modeJuryBtn).toBeVisible();
    await modeJuryBtn.click();

    // Verify Control Tower Drawer is opened
    await expect(page.getByRole('heading', { name: /Tour de Contrôle DevSecOps/i })).toBeVisible();
    await expect(page.getByText(/Jenkins Pipeline/i)).toBeVisible();
    await expect(page.getByText(/ArgoCD GitOps/i)).toBeVisible();
    await expect(page.getByText(/Canary Split/i)).toBeVisible();

    // Execute Scenario 1: Canary Rollback
    const scenario1Btn = page.getByRole('button', { name: /Lancer la démo/i }).first();
    await scenario1Btn.click();

    // Verify terminal logs appear
    await expect(page.getByText(/Initialisation du scénario/i)).toBeVisible();
    await expect(page.getByText(/Injection de chaos/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Déclenchement automatique du ROLLBACK/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Décrochage de conformité ESTC validé avec succès/i)).toBeVisible({ timeout: 8000 });
  });
});
