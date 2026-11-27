import { test, expect } from '@playwright/test';

test.describe('E2E Banking Journey: 5-Step SEPA Transfer Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Quick login as Alice or Demo User
    const demoAliceBtn = page.getByRole('button', { name: /Alice Dupont/i });
    if (await demoAliceBtn.isVisible()) {
      await demoAliceBtn.click();
      await page.getByRole('button', { name: /Accéder à mon espace/i }).click();

      const mfaInputs = page.locator('input[inputmode="numeric"]');
      if (await mfaInputs.first().isVisible()) {
        const count = await mfaInputs.count();
        for (let i = 0; i < count; i++) {
          await mfaInputs.nth(i).fill('1');
        }
        await page.getByRole('button', { name: /Valider et ouvrir la session/i }).click();
      }
    }
  });

  test('completes full transfer journey from beneficiary selection to certified receipt', async ({ page }) => {
    // Navigate to Transfers tab
    const transfersTab = page.getByRole('button', { name: /Virements/i });
    if (await transfersTab.isVisible()) {
      await transfersTab.click();
    }

    await expect(page.getByRole('heading', { name: /Assistant de Virement SEPA/i })).toBeVisible();

    // Step 1: Select Bob Martin
    await page.getByText('Bob Martin').first().click();

    // Step 2: Amount input
    await expect(page.getByText(/Montant du virement/i)).toBeVisible();
    const amountInput = page.locator('input[inputmode="decimal"]');
    await amountInput.fill('150.00');

    // Quick preset chip check
    await page.getByRole('button', { name: /\+50 €/i }).click();

    // Reason
    await page.getByPlaceholder(/Ex\. Loyer/i).fill('Test Virement Playwright E2E');
    await page.getByRole('button', { name: /Vérifier le récapitulatif/i }).click();

    // Step 3: Review
    await expect(page.getByText(/Récapitulatif avant authentification/i)).toBeVisible();
    await expect(page.getByText(/Bob Martin/i)).toBeVisible();
    await page.getByRole('button', { name: /Authentifier le virement/i }).click();

    // Step 4: Step-up MFA
    await expect(page.getByText(/Authentification Forte du Virement/i)).toBeVisible();
    const mfaDigits = page.locator('input[inputmode="numeric"]');
    const digitCount = await mfaDigits.count();
    for (let i = 0; i < digitCount; i++) {
      await mfaDigits.nth(i).fill('9');
    }
    await page.getByRole('button', { name: /Confirmer le virement/i }).click();

    // Step 5: Success & Certified Receipt
    await expect(page.getByText(/Virement exécuté avec succès/i)).toBeVisible();
    await expect(page.getByText(/Reçu d'opération certifié/i)).toBeVisible();
    await expect(page.getByText(/Sceau Cryptographique/i)).toBeVisible();
  });
});
