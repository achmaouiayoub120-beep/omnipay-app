import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/shared/ui';
import { AnimatedBalance } from './AnimatedBalance';
import { formatMinorToCurrency } from '@/shared/lib/money';
import { Copy, Check, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';

export interface AccountSummaryProps {
  accountId: string;
  iban: string;
  balanceMinor: number;
  monthlyInflowMinor: number;
  monthlyOutflowMinor: number;
}

export function AccountSummary({
  accountId,
  iban,
  balanceMinor,
  monthlyInflowMinor,
  monthlyOutflowMinor,
}: AccountSummaryProps) {
  const [copied, setCopied] = useState(false);

  const copyIban = () => {
    navigator.clipboard.writeText(iban);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Solde Principal */}
      <Card className="lg:col-span-2 flex flex-col justify-between">
        <CardHeader className="items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                Compte Courant Particulier
              </span>
              <Badge variant="success" dot size="sm">Vérifié Zero-Trust</Badge>
            </div>
            <CardTitle className="text-lg">Solde Actif Total</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>IBAN :</span>
              <span className="font-mono text-platinum-200">{iban}</span>
              <button
                type="button"
                onClick={copyIban}
                className="text-platinum-400 hover:text-gold-400 focus:outline-none"
                title="Copier l'IBAN"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </CardDescription>
          </div>

          <Badge variant="gold">NÉOBANQUE PREMIUM</Badge>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <AnimatedBalance amountMinor={balanceMinor} />

          <div className="flex items-center gap-2 text-xs text-platinum-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>ID Système : {accountId} · Garantie des dépôts vérifiée</span>
          </div>
        </CardContent>
      </Card>

      {/* Flux Financiers Entrants / Sortants */}
      <div className="flex flex-col gap-4">
        {/* Entrées */}
        <Card className="p-4 flex-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-platinum-400">Entrées (Ce mois)</div>
              <div className="text-base font-bold text-emerald-500 tabular-nums">
                +{formatMinorToCurrency(monthlyInflowMinor)}
              </div>
            </div>
          </div>
          <span className="text-[11px] text-platinum-500">2 virements</span>
        </Card>

        {/* Sorties */}
        <Card className="p-4 flex-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-crimson-500/15 text-crimson-500 flex items-center justify-center border border-crimson-500/30">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-platinum-400">Sorties (Ce mois)</div>
              <div className="text-base font-bold text-crimson-500 tabular-nums">
                -{formatMinorToCurrency(monthlyOutflowMinor)}
              </div>
            </div>
          </div>
          <span className="text-[11px] text-platinum-500">4 opérations</span>
        </Card>
      </div>
    </div>
  );
}
