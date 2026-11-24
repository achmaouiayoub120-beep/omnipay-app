import { useEffect, useState } from 'react';
import { formatMinorToCurrency, SupportedCurrency } from '@/shared/lib/money';
import { Button } from '@/shared/ui';
import { Eye, EyeOff } from 'lucide-react';

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

  // Animation fluide du compteur de solde (Framer Motion / RequestAnimationFrame)
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 800; // ms
    const startValue = displayValue;
    const diff = amountMinor - startValue;

    if (diff === 0) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Easing out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + diff * easeOut));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [amountMinor]);

  return (
    <div className={`flex items-baseline gap-3 ${className}`}>
      <span className="text-3xl sm:text-4xl font-extrabold text-platinum-50 tracking-tight tabular-nums">
        {isMasked ? '••••••••' : formatMinorToCurrency(displayValue, currency)}
      </span>

      <Button
        variant="ghost"
        size="iconSm"
        onClick={() => setIsMasked((m) => !m)}
        title={isMasked ? 'Afficher le solde' : 'Masquer le solde (Confidentialité)'}
        className="text-platinum-400 hover:text-gold-400"
      >
        {isMasked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        <span className="sr-only">Mode montants masqués</span>
      </Button>
    </div>
  );
}
