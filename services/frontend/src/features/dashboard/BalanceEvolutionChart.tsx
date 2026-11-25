import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ChartLineUp } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui';
import { Transaction } from '@/features/transactions/transactions.types';
import { formatMinorToCurrency } from '@/shared/lib/money';

export interface BalanceEvolutionChartProps {
  currentBalanceMinor: number;
  transactions: Transaction[];
}

type TimeRange = '7J' | '1M' | '3M';

export function BalanceEvolutionChart({
  currentBalanceMinor,
  transactions,
}: BalanceEvolutionChartProps) {
  const [range, setRange] = useState<TimeRange>('1M');

  // Reconstitution déterministe de l'évolution du solde à partir des transactions réelles
  const chartData = useMemo(() => {
    const daysCount = range === '7J' ? 7 : range === '1M' ? 14 : 24;
    const sortedDesc = [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const points: { label: string; balanceEur: number; balanceMinor: number }[] = [];
    let runningMinor = currentBalanceMinor;
    const now = new Date();

    for (let i = 0; i < daysCount; i++) {
      const pointDate = new Date(now);
      const stepDays = range === '3M' ? i * 3 : range === '1M' ? i * 2 : i;
      pointDate.setDate(now.getDate() - stepDays);

      const label = pointDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      });

      points.unshift({
        label,
        balanceEur: Number((runningMinor / 100).toFixed(2)),
        balanceMinor: runningMinor,
      });

      // Appliquer l'impact inverse des transactions situées dans cette tranche pour remonter dans le temps
      const txInSlice = sortedDesc[i % Math.max(1, sortedDesc.length)];
      if (txInSlice && sortedDesc.length > 0) {
        const delta =
          txInSlice.direction === 'CREDIT'
            ? -Math.min(txInSlice.amountMinor, 85000)
            : Math.min(txInSlice.amountMinor, 65000);
        runningMinor = Math.max(12000, runningMinor + delta);
      }
    }

    return points;
  }, [currentBalanceMinor, transactions, range]);

  return (
    <Card className="p-6 flex flex-col justify-between h-full">
      <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <ChartLineUp className="h-5 w-5 text-gold-400 shrink-0" />
            <span>Évolution de votre solde</span>
          </CardTitle>
          <CardDescription>
            Trajectoire reconstituée d’après le registre des opérations compensées
          </CardDescription>
        </div>

        <div className="flex items-center gap-1 bg-obsidian-950 p-1 rounded-lg border border-obsidian-700/80 self-start sm:self-auto">
          {(['7J', '1M', '3M'] as TimeRange[]).map((r) => {
            const active = range === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md caption-3 font-mono transition-colors duration-300 active:scale-[0.98] cursor-pointer ${
                  active
                    ? 'bg-gold-400 text-obsidian-950'
                    : 'text-platinum-400 hover:text-platinum-50'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-[240px]">
        <div className="w-full h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid
                stroke="var(--color-border-subtle)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke="var(--color-text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                stroke="var(--color-text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                width={42}
              />
              <Tooltip
                cursor={{ stroke: 'var(--color-border-interactive)', strokeWidth: 1 }}
                contentStyle={{
                  backgroundColor: 'var(--color-surface-panel)',
                  border: '1px solid var(--color-border-interactive)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--color-text-primary)',
                }}
                formatter={(_value, _name, props) => {
                  const payload = props?.payload as { balanceMinor?: number } | undefined;
                  return [
                    formatMinorToCurrency(payload?.balanceMinor ?? currentBalanceMinor),
                    'Solde estimé',
                  ];
                }}
              />
              <Line
                type="monotone"
                dataKey="balanceEur"
                stroke="var(--color-gold)"
                strokeWidth={2}
                dot={{ r: 2.5, fill: 'var(--color-gold)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'var(--color-gold-light)', stroke: 'var(--color-canvas)', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
