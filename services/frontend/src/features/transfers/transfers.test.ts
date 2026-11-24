import { describe, it, expect, beforeEach } from 'vitest';
import { useTransferStore } from './transfers.store';

describe('Transfer Store & 5-Step Wizard', () => {
  beforeEach(() => {
    useTransferStore.getState().resetWizard();
  });

  it('initializes at beneficiary step with empty draft', () => {
    const state = useTransferStore.getState();
    expect(state.currentStep).toBe('beneficiary');
    expect(state.draft.beneficiary).toBeNull();
    expect(state.draft.amountMinor).toBe(0);
    expect(state.idempotencyKey).toBeTruthy();
  });

  it('selects an existing verified beneficiary and updates draft', () => {
    const ben = useTransferStore.getState().beneficiaries[0];
    useTransferStore.getState().selectBeneficiary(ben);

    expect(useTransferStore.getState().draft.beneficiary).toEqual(ben);
  });

  it('adds custom beneficiary with strict Modulo-97 validation', () => {
    // Valid Bob Martin IBAN
    const added = useTransferStore.getState().addCustomBeneficiary(
      'Bob Martin Test',
      'FR4110058000010000000002024'
    );

    expect(added.name).toBe('Bob Martin Test');
    expect(added.iban).toContain('FR41');
    expect(useTransferStore.getState().draft.beneficiary?.name).toBe('Bob Martin Test');
  });

  it('throws error when adding custom beneficiary with invalid Modulo-97 IBAN', () => {
    expect(() => {
      useTransferStore.getState().addCustomBeneficiary(
        'Fake Account',
        'FR0000000000000000000000000'
      );
    }).toThrow();
  });

  it('manages amount and transitions through the wizard steps', () => {
    useTransferStore.getState().setAmountMinor(15000); // 150.00 €
    expect(useTransferStore.getState().draft.amountMinor).toBe(15000);

    useTransferStore.getState().setStep('review');
    expect(useTransferStore.getState().currentStep).toBe('review');

    useTransferStore.getState().setStep('mfa');
    expect(useTransferStore.getState().currentStep).toBe('mfa');
  });

  it('submits transfer with idempotency key and generates verified receipt', async () => {
    const ben = useTransferStore.getState().beneficiaries[0];
    useTransferStore.getState().selectBeneficiary(ben);
    useTransferStore.getState().setAmountMinor(5000);
    useTransferStore.getState().setReason('Paiement test unitaire');

    const success = await useTransferStore.getState().submitTransfer();
    expect(success).toBe(true);

    const state = useTransferStore.getState();
    expect(state.currentStep).toBe('success');
    expect(state.lastReceipt).not.toBeNull();
    expect(state.lastReceipt?.amountMinor).toBe(5000);
    expect(state.lastReceipt?.status).toBe('SUCCESS');
    expect(state.lastReceipt?.securitySealHash).toContain('ESTC-SEAL-');
  });
});
