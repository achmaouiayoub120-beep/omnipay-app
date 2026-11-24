import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ShieldCheck, Lock, RotateCw, AlertCircle, Loader2 } from 'lucide-react';
import { useTransferStore } from '../transfers.store';
import { formatMinorToCurrency } from '../../../shared/lib/money';

export const StepMfa: React.FC = () => {
  const { draft, setStep, submitTransfer, isLoading, errorMessage } = useTransferStore();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleDigitChange = (index: number, val: string) => {
    // Only accept numeric digit
    const cleaned = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);

    // Auto focus next
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
    if (!isComplete || isLoading) return;
    await submitTransfer();
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#070A12] border border-[var(--color-gold)]/30 rounded-2xl p-6 text-center space-y-5">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div>
          <h4 className="text-base font-semibold text-white">
            Authentification Forte du Virement (SCA)
          </h4>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Pour valider le transfert de{' '}
            <strong className="text-[var(--color-gold)] font-mono">
              {formatMinorToCurrency(draft.amountMinor)}
            </strong>{' '}
            au bénéficiaire{' '}
            <strong className="text-white">{draft.beneficiary?.name}</strong>, saisissez le code de validation sécurisé à 6 chiffres.
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
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`w-10 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold bg-[#0B101E] border rounded-xl text-white focus:outline-none transition-all ${
                digit
                  ? 'border-[var(--color-gold)] shadow-md shadow-[var(--color-gold)]/10'
                  : 'border-white/10 focus:border-[var(--color-gold)]'
              }`}
              autoFocus={idx === 0}
            />
          ))}
        </div>

        {/* Countdown timer */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <span>Code valide pendant encore :</span>
          <span className="font-mono font-semibold text-[var(--color-gold)]">
            {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
          </span>
          {countdown === 0 && (
            <button
              type="button"
              onClick={() => setCountdown(60)}
              className="inline-flex items-center gap-1 text-[var(--color-gold)] hover:underline ml-2"
            >
              <RotateCw className="w-3 h-3" />
              <span>Renvoyer un code</span>
            </button>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-[var(--color-crimson)]/10 border border-[var(--color-crimson)]/30 rounded-xl flex items-center gap-2 text-xs text-[var(--color-crimson)] text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep('review')}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au récapitulatif</span>
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isComplete || isLoading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-[#070A12] shadow-lg shadow-[var(--color-gold)]/20 hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Compensation en cours...</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Confirmer le virement</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
