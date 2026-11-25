import React, { useState, useId } from 'react';
import { ArrowLeft, ArrowRight, Lightning, ShieldWarning, Check } from '@phosphor-icons/react';
import { useTransferStore } from '../transfers.store';
import { formatMinorToCurrency, parseInputToMinor } from '../../../shared/lib/money';
import { maskIban } from '../../../shared/lib/iban';
import { Button } from '@/shared/ui';

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
        <div className="flex items-center justify-between p-4 bg-obsidian-950/70 border border-obsidian-700/80 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gold-400/10 text-gold-400 border border-gold-400/30 flex items-center justify-center caption-3 shrink-0">
              {draft.beneficiary.avatarInitials}
            </div>
            <div className="min-w-0">
              <div className="caption-3 text-platinum-50 truncate">
                {draft.beneficiary.name}
              </div>
              <div className="caption-5 font-mono tabular-nums text-platinum-400 truncate">
                {maskIban(draft.beneficiary.iban)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep('beneficiary')}
            className="caption-3 text-gold-400 hover:underline shrink-0 cursor-pointer"
          >
            Modifier
          </button>
        </div>
      )}

      {/* Amount input block */}
      <div className="bg-obsidian-950/70 border border-obsidian-700/80 rounded-xl p-6 text-center space-y-5">
        <label htmlFor={amountInputId} className="block caption-3 text-platinum-400">
          Montant du virement
        </label>

        <div className="relative inline-flex items-center justify-center max-w-full">
          <input
            id={amountInputId}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-56 sm:w-72 bg-transparent text-center heading-3 sm:heading-2 font-mono tabular-nums text-platinum-50 focus:outline-none placeholder-platinum-500"
            autoFocus
          />
          <span className="heading-4 text-gold-400 ml-2">€</span>
        </div>

        {/* Quick add chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleAddPreset(5000)}
            className="px-3 py-1.5 rounded-lg caption-4 bg-obsidian-900 border border-obsidian-700 text-platinum-200 hover:border-gold-400/50 hover:text-platinum-50 transition-colors duration-300 active:scale-[0.98] cursor-pointer"
          >
            +50 €
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset(10000)}
            className="px-3 py-1.5 rounded-lg caption-4 bg-obsidian-900 border border-obsidian-700 text-platinum-200 hover:border-gold-400/50 hover:text-platinum-50 transition-colors duration-300 active:scale-[0.98] cursor-pointer"
          >
            +100 €
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset(25000)}
            className="px-3 py-1.5 rounded-lg caption-4 bg-obsidian-900 border border-obsidian-700 text-platinum-200 hover:border-gold-400/50 hover:text-platinum-50 transition-colors duration-300 active:scale-[0.98] cursor-pointer"
          >
            +250 €
          </button>
          <button
            type="button"
            onClick={handleSetMax}
            className="px-3 py-1.5 rounded-lg caption-3 bg-gold-400/10 border border-gold-400/35 text-gold-400 hover:bg-gold-400/20 transition-colors duration-300 active:scale-[0.98] cursor-pointer"
          >
            Solde max
          </button>
        </div>

        {/* Balance metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-obsidian-700/60 text-left">
          <div className="p-3 bg-obsidian-900 rounded-lg border border-obsidian-700/70">
            <span className="caption-5 text-platinum-400 block">Solde disponible</span>
            <span className="caption-3 font-mono tabular-nums text-platinum-50 mt-0.5 block">
              {formatMinorToCurrency(CURRENT_BALANCE_MINOR)}
            </span>
          </div>
          <div className="p-3 bg-obsidian-900 rounded-lg border border-obsidian-700/70">
            <span className="caption-5 text-platinum-400 block">Solde après opération</span>
            <span
              className={`caption-3 font-mono tabular-nums mt-0.5 block ${
                isOverBalance ? 'text-crimson-500' : 'text-emerald-500'
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
          <label htmlFor={reasonInputId} className="block caption-3 text-platinum-200">
            Motif ou référence du virement (facultatif)
          </label>
          <span className="caption-5 text-platinum-500 font-mono tabular-nums">
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
          className="w-full h-10 bg-obsidian-950 border border-obsidian-700 rounded-lg px-3.5 body-6 text-platinum-50 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
        />
      </div>

      {/* Execution mode: Instant SEPA */}
      <button
        type="button"
        onClick={() => setInstant(!draft.instant)}
        aria-pressed={draft.instant}
        className="w-full text-left p-4 bg-obsidian-950/70 border border-gold-400/30 rounded-xl flex items-center justify-between gap-4 cursor-pointer hover:border-gold-400/60 transition-colors duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold-400/10 text-gold-400 flex items-center justify-center shrink-0">
            <Lightning className="w-5 h-5" />
          </div>
          <div>
            <div className="caption-3 text-platinum-50 flex flex-wrap items-center gap-2">
              <span>Virement instantané SEPA (10 secondes)</span>
              <span className="px-2 py-0.5 rounded-md text-xs bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/25">
                0,00 € inclus
              </span>
            </div>
            <div className="caption-5 text-platinum-400 mt-0.5">
              Règlement immédiat 24h/24 avec confirmation de compensation TIPS.
            </div>
          </div>
        </div>

        <div
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
            draft.instant
              ? 'bg-gold-400 border-gold-400 text-obsidian-950'
              : 'border-obsidian-600'
          }`}
        >
          {draft.instant && <Check className="w-3.5 h-3.5" weight="bold" />}
        </div>
      </button>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-crimson-500/10 border border-crimson-500/30 rounded-lg flex items-center gap-2 caption-4 text-crimson-500">
          <ShieldWarning className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep('beneficiary')}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Retour aux bénéficiaires</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleNext}
          disabled={currentAmountMinor <= 0 || isOverBalance || isOverDailyLimit}
        >
          <span>Vérifier le récapitulatif</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Button>
      </div>
    </div>
  );
};
