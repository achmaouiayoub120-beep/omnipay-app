import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ShieldCheck, Lock, ArrowsClockwise, WarningCircle, CircleNotch } from '@phosphor-icons/react';
import { useTransferStore } from '../transfers.store';
import { formatMinorToCurrency } from '../../../shared/lib/money';
import { Button } from '@/shared/ui';

export const StepMfa: React.FC = () => {
  const { draft, setStep, submitTransfer, isLoading, pendingCount, errorMessage } = useTransferStore();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    inputRefs.current[Math.min(5, pasted.length - 1)]?.focus();
  };

  const code = digits.join('');
  const isComplete = code.length === 6;

  const handleSubmit = async () => {
    if (!isComplete) return;
    // Pas de blocage pendant l'envoi : des clics répétés envoient la MÊME clé d'idempotence et le serveur dédoublonne.
    await submitTransfer();
  };

  return (
    <div className="space-y-6">
      <div className="bg-obsidian-950/70 border border-gold-400/35 rounded-xl p-6 text-center space-y-5">
        <div className="w-12 h-12 mx-auto rounded-lg bg-gold-400/10 text-gold-400 border border-gold-400/30 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h4 className="title-2 text-platinum-50 font-semibold">
            Authentification Forte du Virement (SCA)
          </h4>
          <p className="caption-2 text-platinum-400 max-w-md mx-auto">
            Pour valider le transfert de{' '}
            <strong className="text-gold-400 font-mono tabular-nums">
              {formatMinorToCurrency(draft.amountMinor)}
            </strong>{' '}
            vers <strong className="text-platinum-50">{draft.beneficiary?.name}</strong>, saisissez le code sécurisé à 6 chiffres.
          </p>
        </div>

        {/* 6 Digit Input Group */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              aria-label={`Chiffre ${idx + 1} sur 6`}
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`w-10 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl font-semibold bg-obsidian-900 border rounded-lg text-platinum-50 focus:outline-none transition-colors ${
                digit
                  ? 'border-gold-400'
                  : 'border-obsidian-700 focus:border-gold-400 focus:ring-1 focus:ring-gold-400'
              }`}
              autoFocus={idx === 0}
            />
          ))}
        </div>

        {/* Countdown timer */}
        <div className="flex items-center justify-center gap-2 caption-4 text-platinum-400">
          <span>Code valide pendant encore :</span>
          <span className="font-mono tabular-nums font-semibold text-gold-400">
            {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
          </span>
          {countdown === 0 && (
            <button
              type="button"
              onClick={() => setCountdown(60)}
              className="inline-flex items-center gap-1 text-gold-400 hover:underline ml-2 cursor-pointer"
            >
              <ArrowsClockwise className="w-3.5 h-3.5" />
              <span>Renvoyer un code</span>
            </button>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-crimson-500/10 border border-crimson-500/30 rounded-lg flex items-center gap-2 caption-4 text-crimson-500 text-left">
            <WarningCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep('review')}
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Retour au récapitulatif</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleSubmit}
          disabled={!isComplete}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <CircleNotch className="h-4 w-4 animate-spin shrink-0" />
              <span>Compensation en cours… ({pendingCount} requête{pendingCount > 1 ? 's' : ''}, même clé)</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 shrink-0" />
              <span>Confirmer le virement</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
