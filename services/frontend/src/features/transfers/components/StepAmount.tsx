import React, { useState, useId } from 'react';
import { ArrowLeft, ArrowRight, Zap, ShieldAlert, Check } from 'lucide-react';
import { useTransferStore } from '../transfers.store';
import { formatMinorToCurrency, parseInputToMinor } from '../../../shared/lib/money';
import { maskIban } from '../../../shared/lib/iban';

// Solde compte utilisateur principal (ACC-USER-003): 14 250,00 €
const CURRENT_BALANCE_MINOR = 1425000;
const DAILY_LIMIT_MINOR = 500000; // 5 000,00 €

export const StepAmount: React.FC = () => {
  const { draft, setAmountMinor, setReason, setInstant, setStep } = useTransferStore();
  const [inputValue, setInputValue] = useState(
    draft.amountMinor > 0 ? (draft.amountMinor / 100).toFixed(2) : ''
  );
  const [error, setError] = useState<string | null>(null);

  const amountInputId = useId();
  const reasonInputId = useId();

  const currentAmountMinor = draft.amountMinor;
  const projectedBalanceMinor = CURRENT_BALANCE_MINOR - currentAmountMinor;
  const isOverBalance = projectedBalanceMinor < 0;
  const isOverDailyLimit = currentAmountMinor > DAILY_LIMIT_MINOR;

  const handleInputChange = (raw: string) => {
    // Only allow numbers and decimal separators
    const sanitized = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    setInputValue(sanitized);

    const minor = parseInputToMinor(sanitized);
    setAmountMinor(minor);

    if (minor > CURRENT_BALANCE_MINOR) {
      setError('Le montant dépasse le solde disponible sur ce compte.');
    } else if (minor > DAILY_LIMIT_MINOR) {
      setError('Le montant dépasse le plafond journalier autorisé (5 000,00 €).');
    } else {
      setError(null);
    }
  };

  const handleAddPreset = (addMinor: number) => {
    const nextMinor = Math.min(CURRENT_BALANCE_MINOR, currentAmountMinor + addMinor);
    setAmountMinor(nextMinor);
    setInputValue((nextMinor / 100).toFixed(2));
    setError(null);
  };

  const handleSetMax = () => {
    const maxMinor = Math.min(CURRENT_BALANCE_MINOR, DAILY_LIMIT_MINOR);
    setAmountMinor(maxMinor);
    setInputValue((maxMinor / 100).toFixed(2));
    setError(null);
  };

  const handleNext = () => {
    if (currentAmountMinor <= 0) {
      setError('Veuillez saisir un montant supérieur à 0,00 €.');
      return;
    }
    if (isOverBalance) {
      setError('Solde disponible insuffisant pour ce virement.');
      return;
    }
    if (isOverDailyLimit) {
      setError('Plafond journalier dépassé (5 000,00 € max).');
      return;
    }
    setStep('review');
  };

  return (
    <div className="space-y-6">
      {/* Selected beneficiary badge */}
      {draft.beneficiary && (
        <div className="flex items-center justify-between p-3.5 bg-[#070A12] border border-white/10 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30 flex items-center justify-center font-bold text-xs">
              {draft.beneficiary.avatarInitials}
            </div>
            <div>
              <div className="text-xs font-semibold text-white">
                {draft.beneficiary.name}
              </div>
              <div className="text-[11px] font-mono text-gray-400">
                {maskIban(draft.beneficiary.iban)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep('beneficiary')}
            className="text-xs font-medium text-[var(--color-gold)] hover:underline"
          >
            Modifier
          </button>
        </div>
      )}

      {/* Amount input block */}
      <div className="bg-[#070A12] border border-white/10 rounded-2xl p-6 text-center space-y-4">
        <label htmlFor={amountInputId} className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
          Montant du virement
        </label>

        <div className="relative inline-flex items-center justify-center">
          <input
            id={amountInputId}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full max-w-[280px] bg-transparent text-center text-4xl sm:text-5xl font-extrabold font-mono text-white tracking-tight focus:outline-none placeholder-gray-600"
            autoFocus
          />
          <span className="text-2xl sm:text-3xl font-bold text-[var(--color-gold)] ml-2">€</span>
        </div>

        {/* Quick add chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => handleAddPreset(5000)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0B101E] border border-white/10 text-gray-300 hover:border-[var(--color-gold)]/50 hover:text-white transition-all"
          >
            +50 €
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset(10000)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0B101E] border border-white/10 text-gray-300 hover:border-[var(--color-gold)]/50 hover:text-white transition-all"
          >
            +100 €
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset(25000)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0B101E] border border-white/10 text-gray-300 hover:border-[var(--color-gold)]/50 hover:text-white transition-all"
          >
            +250 €
          </button>
          <button
            type="button"
            onClick={handleSetMax}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-all"
          >
            Solde Max
          </button>
        </div>

        {/* Balance metrics */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5 text-left">
          <div className="p-3 bg-[#0B101E] rounded-xl border border-white/5">
            <span className="text-[11px] text-gray-400 block">Solde disponible</span>
            <span className="text-xs font-mono font-semibold text-white">
              {formatMinorToCurrency(CURRENT_BALANCE_MINOR)}
            </span>
          </div>
          <div className="p-3 bg-[#0B101E] rounded-xl border border-white/5">
            <span className="text-[11px] text-gray-400 block">Solde après opération</span>
            <span
              className={`text-xs font-mono font-semibold ${
                isOverBalance ? 'text-[var(--color-crimson)]' : 'text-[var(--color-emerald)]'
              }`}
            >
              {formatMinorToCurrency(projectedBalanceMinor)}
            </span>
          </div>
        </div>
      </div>

      {/* Transfer reason (motif) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={reasonInputId} className="block text-xs font-medium text-gray-300">
            Motif ou référence du virement (facultatif)
          </label>
          <span className="text-[11px] text-gray-500 font-mono">
            {draft.reason.length}/140 car.
          </span>
        </div>
        <input
          id={reasonInputId}
          type="text"
          maxLength={140}
          placeholder="Ex. Loyer Décembre, Facture #4102, Remboursement restaurant"
          value={draft.reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-[#070A12] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors"
        />
      </div>

      {/* Execution mode: Instant SEPA */}
      <div
        onClick={() => setInstant(!draft.instant)}
        className="p-4 bg-[#070A12] border border-[var(--color-gold)]/30 rounded-xl flex items-center justify-between cursor-pointer hover:border-[var(--color-gold)]/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold)] flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <span>Virement Instantané SEPA (10 secondes)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] font-bold">
                0,00 € GRATUIT
              </span>
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Règlement immédiat 24h/24 et 7j/7 avec confirmation de compensation TIPS.
            </div>
          </div>
        </div>

        <div
          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
            draft.instant
              ? 'bg-[var(--color-gold)] border-[var(--color-gold)] text-[#070A12]'
              : 'border-white/20'
          }`}
        >
          {draft.instant && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-[var(--color-crimson)]/10 border border-[var(--color-crimson)]/30 rounded-xl flex items-center gap-2 text-xs text-[var(--color-crimson)]">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep('beneficiary')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux bénéficiaires</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentAmountMinor <= 0 || isOverBalance || isOverDailyLimit}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-[#070A12] shadow-lg shadow-[var(--color-gold)]/20 hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Vérifier le récapitulatif</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
