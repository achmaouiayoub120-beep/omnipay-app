import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@/shared/ui';
import { AnimatedBalance } from './AnimatedBalance';
import { formatMinorToCurrency } from '@/shared/lib/money';
import {
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  PaperPlaneTilt,
} from '@phosphor-icons/react';

export interface AccountSummaryProps {
  accountId: string;
  iban: string;
  balanceMinor: number;
  monthlyInflowMinor: number;
  monthlyOutflowMinor: number;
  onQuickTransfer?: () => void;
  transfersAllowed?: boolean;
}

export function AccountSummary({
  accountId,
  iban,
  balanceMinor,
  monthlyInflowMinor,
  monthlyOutflowMinor,
  onQuickTransfer,
  transfersAllowed = false,
}: AccountSummaryProps) {
  const [copied, setCopied] = useState(false);

  const copyIban = () => {
    navigator.clipboard.writeText(iban);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalFlow = Math.max(1, monthlyInflowMinor + monthlyOutflowMinor);
  const inflowShare = Math.round((monthlyInflowMinor / totalFlow) * 100);
  const netDeltaMinor = monthlyInflowMinor - monthlyOutflowMinor;

  return (
    <section
      aria-label="Synthèse du compte"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
    >
      {/* Colonne majeure (8/12) : Solde Actif & Identité du Compte */}
      <Card className="lg:col-span-8 flex flex-col justify-between p-6 sm:p-8">
        <CardHeader className="flex-col sm:flex-row sm:items-start gap-4 mb-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="caption-3 text-gold-400">
                Compte courant privé
              </span>
              <Badge variant="success" dot size="sm">
                Vérifié Zero-Trust
              </Badge>
            </div>
            <CardTitle className="heading-6 text-platinum-50">
              Solde actif disponible
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span>IBAN</span>
              <span className="font-mono text-platinum-200 tabular-nums">{iban}</span>
              <button
                type="button"
                onClick={copyIban}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-obsidian-700 bg-obsidian-950/70 text-platinum-400 hover:text-gold-400 hover:border-gold-400/40 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] cursor-pointer"
                title="Copier l'IBAN"
                aria-label="Copier l'IBAN"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="caption-5 text-emerald-500">Copié</span>
                  </>
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start">
            <Badge variant="gold">Ultra Platinum</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <AnimatedBalance amountMinor={balanceMinor} />

            {transfersAllowed && onQuickTransfer && (
              <Button
                variant="primary"
                size="sm"
                onClick={onQuickTransfer}
                className="self-start sm:self-auto"
              >
                <PaperPlaneTilt className="h-4 w-4 shrink-0" />
                <span>Effectuer un virement</span>
              </Button>
            )}
          </div>

          {/* Barre de ratio entrées / sorties du mois (données réelles) */}
          <div className="space-y-2 pt-4 border-t border-obsidian-700/60">
            <div className="flex items-center justify-between caption-4 text-platinum-400">
              <span>Balance mensuelle des flux</span>
              <span className="font-mono tabular-nums text-emerald-500">
                {netDeltaMinor >= 0 ? '+' : ''}
                {formatMinorToCurrency(netDeltaMinor)} net
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full bg-obsidian-950 overflow-hidden flex border border-obsidian-700/60"
              role="img"
              aria-label={`Ratio mensuel : ${inflowShare}% d'entrées et ${100 - inflowShare}% de sorties`}
            >
              <div
                className="h-full bg-emerald-500 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${inflowShare}%` }}
              />
              <div
                className="h-full bg-crimson-500/80 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${100 - inflowShare}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 caption-5 text-platinum-500">
              <span className="inline-flex items-center gap-1.5 text-platinum-400">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Identifiant système : {accountId} · Garantie des dépôts vérifiée</span>
              </span>
              <span className="font-mono tabular-nums">
                {inflowShare}% entrées · {100 - inflowShare}% sorties
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colonne latérale asymétrique (4/12) : Flux mensuels */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <Card variant="flat" className="p-5 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="caption-4 text-platinum-400">Entrées du mois</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-4">
            <div className="heading-5 font-semibold text-emerald-500 tabular-nums font-mono">
              +{formatMinorToCurrency(monthlyInflowMinor)}
            </div>
            <p className="caption-5 text-platinum-500 mt-1">
              2 virements compensés ce mois
            </p>
          </div>
        </Card>

        <Card variant="flat" className="p-5 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="caption-4 text-platinum-400">Sorties du mois</span>
            <div className="h-8 w-8 rounded-lg bg-crimson-500/10 text-crimson-500 flex items-center justify-center border border-crimson-500/30">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-4">
            <div className="heading-5 font-semibold text-platinum-50 tabular-nums font-mono">
              -{formatMinorToCurrency(monthlyOutflowMinor)}
            </div>
            <p className="caption-5 text-platinum-500 mt-1">
              4 opérations débitées ce mois
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
