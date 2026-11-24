import React from 'react';
import { Users, Coins, FileCheck, Lock, CheckCircle2 } from 'lucide-react';
import { useTransferStore } from '../transfers.store';
import { StepBeneficiary } from './StepBeneficiary';
import { StepAmount } from './StepAmount';
import { StepReview } from './StepReview';
import { StepMfa } from './StepMfa';
import { StepSuccess } from './StepSuccess';
import { TransferStep } from '../transfers.types';

const STEPS: { key: TransferStep; label: string; icon: React.ElementType }[] = [
  { key: 'beneficiary', label: 'Bénéficiaire', icon: Users },
  { key: 'amount', label: 'Montant', icon: Coins },
  { key: 'review', label: 'Récapitulatif', icon: FileCheck },
  { key: 'mfa', label: 'Sécurité MFA', icon: Lock },
  { key: 'success', label: 'Confirmation', icon: CheckCircle2 },
];

interface TransferWizardProps {
  onGoToHistory?: () => void;
}

export const TransferWizard: React.FC<TransferWizardProps> = ({ onGoToHistory }) => {
  const { currentStep } = useTransferStore();

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="bg-[#0B101E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative subtle ambient gold aura */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-[var(--color-gold)]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Stepper Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Assistant de Virement SEPA
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Transfert instantané de fonds avec garantie d'idempotence et validation Modulo-97.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-3 py-1 rounded-full border border-[var(--color-gold)]/20">
            Étape {currentStepIndex + 1} / {STEPS.length}
          </span>
        </div>

        {/* Stepper progress track */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.key} className="flex flex-col items-center text-center">
                <div
                  className={`w-full h-1.5 rounded-full mb-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[var(--color-emerald)]'
                      : isCurrent
                      ? 'bg-[var(--color-gold)] shadow-sm shadow-[var(--color-gold)]/40'
                      : 'bg-white/10'
                  }`}
                />
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium">
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isCompleted
                        ? 'text-[var(--color-emerald)]'
                        : isCurrent
                        ? 'text-[var(--color-gold)]'
                        : 'text-gray-500'
                    }`}
                  />
                  <span
                    className={
                      isCompleted
                        ? 'text-gray-300'
                        : isCurrent
                        ? 'text-white font-semibold'
                        : 'text-gray-500'
                    }
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Step Body */}
      <div className="relative z-10">
        {currentStep === 'beneficiary' && <StepBeneficiary />}
        {currentStep === 'amount' && <StepAmount />}
        {currentStep === 'review' && <StepReview />}
        {currentStep === 'mfa' && <StepMfa />}
        {currentStep === 'success' && <StepSuccess onGoToHistory={onGoToHistory} />}
      </div>
    </div>
  );
};
