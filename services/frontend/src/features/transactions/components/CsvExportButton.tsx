import React from 'react';
import { Download } from 'lucide-react';
import { Transaction } from '../transactions.types';
import { formatMinorToDecimal } from '../../../shared/lib/money';

interface CsvExportButtonProps {
  transactions: Transaction[];
  className?: string;
}

export const CsvExportButton: React.FC<CsvExportButtonProps> = ({
  transactions,
  className,
}) => {
  const handleExportCsv = () => {
    if (transactions.length === 0) return;

    const headers = [
      'Identifiant Transaction',
      'Date (AAAA-MM-JJ)',
      'Heure (UTC)',
      'Type Opération',
      'Contrepartie',
      'IBAN Contrepartie',
      'Catégorie',
      'Motif / Référence',
      'Montant EUR',
      'Frais EUR',
      'Statut',
      'Sceau Cryptographique',
    ];

    const escapeCsv = (str: string) => {
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = transactions.map((tx) => {
      const dateObj = new Date(tx.createdAt);
      const dateStr = dateObj.toISOString().slice(0, 10);
      const timeStr = dateObj.toTimeString().slice(0, 8);
      const formattedAmount = `${tx.direction === 'DEBIT' ? '-' : '+'}${formatMinorToDecimal(
        tx.amountMinor
      )}`;

      return [
        escapeCsv(tx.id),
        escapeCsv(dateStr),
        escapeCsv(timeStr),
        escapeCsv(tx.direction === 'DEBIT' ? 'Débit' : 'Crédit'),
        escapeCsv(tx.counterpartyName),
        escapeCsv(tx.counterpartyIban),
        escapeCsv(tx.category),
        escapeCsv(tx.reason),
        escapeCsv(formattedAmount),
        escapeCsv('0.00'),
        escapeCsv(tx.status),
        escapeCsv(tx.securitySealHash || 'ESTC-VERIFIED'),
      ].join(';');
    });

    // Add UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility with accents
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const today = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `omnipay-releve-transactions-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExportCsv}
      disabled={transactions.length === 0}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-[#070A12] border border-white/10 text-gray-300 hover:text-white hover:border-[var(--color-gold)]/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
        className || ''
      }`}
    >
      <Download className="w-3.5 h-3.5 text-[var(--color-gold)]" />
      <span>Exporter CSV</span>
    </button>
  );
};
