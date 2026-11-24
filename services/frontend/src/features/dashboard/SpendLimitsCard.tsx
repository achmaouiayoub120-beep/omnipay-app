import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui';
import { formatMinorToCurrency } from '@/shared/lib/money';
import { Gauge, ShieldAlert } from 'lucide-react';

export interface SpendLimitsCardProps {
  spentMinor: number;
  limitMinor: number;
}

export function SpendLimitsCard({ spentMinor, limitMinor }: SpendLimitsCardProps) {
  const percent = Math.min(100, Math.round((spentMinor / limitMinor) * 100));
  const isHigh = percent >= 80;

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="mb-2">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gauge className="h-4 w-4 text-gold-400" />
            <span>Plafond de Paiement Mensuel</span>
          </CardTitle>
          <CardDescription>Carte Ultra Platinum · Reste {formatMinorToCurrency(limitMinor - spentMinor)}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        <div className="flex justify-between items-baseline text-xs font-semibold">
          <span className="text-platinum-400">Utilisé ce mois :</span>
          <span className="tabular-nums text-platinum-100">{formatMinorToCurrency(spentMinor)}</span>
        </div>

        {/* Barre de progression */}
        <div className="w-full h-2.5 bg-obsidian-950 rounded-full overflow-hidden border border-obsidian-750">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isHigh ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,165,36,0.5)]' : 'bg-gold-400 shadow-gold-glow-subtle'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-platinum-500">
          <span>0,00 €</span>
          <span>{percent}% ({formatMinorToCurrency(limitMinor)} max)</span>
        </div>

        {isHigh && (
          <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2 font-medium">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            <span>Attention : vous approchez de la limite mensuelle (80% atteint).</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
