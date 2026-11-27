import { useEffect, useState } from 'react';
import { formatMinorToCurrency, SupportedCurrency } from '@/shared/lib/money';
import { Button } from '@/shared/ui';
import { Eye, EyeSlash } from '@phosphor-icons/react';

export interface AnimatedBalanceProps {
  amountMinor: number;
  currency?: SupportedCurrency;
  className?: string;
}

export function AnimatedBalance({
  amountMinor,
  currency = 'EUR',
  className = '',
}: AnimatedBalanceProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isMasked, setIsMasked] = useState(false);

  // Animation fluide du compteur de solde (easing cubic-out)
  useEffect(() => {
    let startTimestamp: number | null = null;
    let frameId = 0;
    const duration = 700;
    const startValue = displayValue;
    const diff = amountMinor - startValue;

    if (diff === 0) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + diff * easeOut));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [amountMinor]);

  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      <span className="heading-3 sm:heading-2 font-semibold text-platinum-50 tabular-nums">
        {isMasked ? '••••••••' : formatMinorToCurrency(displayValue, currency)}
      </span>

      <Button
        variant="ghost"
        size="iconSm"
        onClick={() => setIsMasked((m) => !m)}
        title={isMasked ? 'Afficher le solde' : 'Masquer le solde (Confidentialité)'}
        aria-label={isMasked ? 'Afficher le solde' : 'Masquer le solde'}
        className="text-platinum-400 hover:text-gold-400"
      >
        {isMasked ? <Eye className="h-4 w-4" /> : <EyeSlash className="h-4 w-4" />}
      </Button>
    </div>
  );
}
