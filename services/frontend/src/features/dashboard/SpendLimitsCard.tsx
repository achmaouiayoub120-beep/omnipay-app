import { formatMinorToCurrency } from '@/shared/lib/money';
import { Gauge, ShieldWarning } from '@phosphor-icons/react';

export interface SpendLimitsCardProps {
  spentMinor: number;
  limitMinor: number;
}

export function SpendLimitsCard({ spentMinor, limitMinor }: SpendLimitsCardProps) {
  const safeLimit = Math.max(1, limitMinor);
  const percent = Math.min(100, Math.round((spentMinor / safeLimit) * 100));
  const isHigh = percent >= 80;

  return (
    <div className="rounded-lg bg-obsidian-950/70 border border-obsidian-700/80 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="title-4 text-platinum-50 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-gold-400 shrink-0" />
            <span>Plafond de paiement mensuel</span>
          </h4>
          <p className="caption-5 text-platinum-400 mt-0.5">
            Reste disponible :{' '}
            <span className="font-mono tabular-nums text-platinum-200">
              {formatMinorToCurrency(Math.max(0, limitMinor - spentMinor))}
            </span>
          </p>
        </div>
        <span className="caption-3 font-mono tabular-nums text-gold-400">
          {percent}%
        </span>
      </div>

      {/* Barre de progression */}
      <div className="w-full h-2 bg-obsidian-900 rounded-full overflow-hidden border border-obsidian-700/80">
        <div
          className={`h-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-full ${
            isHigh ? 'bg-amber-500' : 'bg-gold-400'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between items-center caption-5 text-platinum-500 font-mono tabular-nums">
        <span>Utilisé : {formatMinorToCurrency(spentMinor)}</span>
        <span>Max : {formatMinorToCurrency(limitMinor)}</span>
      </div>

      {isHigh && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 caption-4 flex items-center gap-2">
          <ShieldWarning className="h-4 w-4 shrink-0" />
          <span>Seuil d’alerte atteint (80% du plafond mensuel utilisé).</span>
        </div>
      )}
    </div>
  );
}
