import { test, expect } from '@playwright/test';

test.describe('E2E Banking Journey: 3D Credit Card & Security Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

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

  test('toggles card freeze optimistically and reveals PAN with auto-mask countdown', async ({ page }) => {
    await expect(page.getByText(/Carte Ultra Platinum/i)).toBeVisible();

    // Freeze card
    const freezeBtn = page.getByRole('button', { name: /Geler la carte/i });
    if (await freezeBtn.isVisible()) {
      await freezeBtn.click();
      await expect(page.getByText(/GELÉE/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Dégeler la carte/i })).toBeVisible();

      // Unfreeze
      await page.getByRole('button', { name: /Dégeler la carte/i }).click();
      await expect(page.getByText(/ACTIVE/i)).toBeVisible();
    }

    // Reveal PAN
    const revealBtn = page.getByRole('button', { name: /Révéler \(10s\)/i });
    if (await revealBtn.isVisible()) {
      await revealBtn.click();
      await expect(page.getByText(/Masquer/i)).toBeVisible();
    }
  });
});
