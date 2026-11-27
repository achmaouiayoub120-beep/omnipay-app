import React from 'react';
import { Users, Coins, FileText, Lock, CheckCircle } from '@phosphor-icons/react';
import { useTransferStore } from '../transfers.store';
import { StepBeneficiary } from './StepBeneficiary';
import { StepAmount } from './StepAmount';
import { StepReview } from './StepReview';
import { StepMfa } from './StepMfa';
import { StepSuccess } from './StepSuccess';
import { TransferStep } from '../transfers.types';
import { Card } from '@/shared/ui';

const STEPS: { key: TransferStep; label: string; icon: React.ElementType }[] = [
  { key: 'beneficiary', label: 'Bénéficiaire', icon: Users },
  { key: 'amount', label: 'Montant', icon: Coins },
  { key: 'review', label: 'Récapitulatif', icon: FileText },
  { key: 'mfa', label: 'Sécurité MFA', icon: Lock },
  { key: 'success', label: 'Confirmation', icon: CheckCircle },
];

interface TransferWizardProps {
  onGoToHistory?: () => void;
}

export const TransferWizard: React.FC<TransferWizardProps> = ({ onGoToHistory }) => {
  const { currentStep } = useTransferStore();

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <Card className="p-6 sm:p-8 shadow-elevation-2">
      {/* Stepper Header */}
      <div className="mb-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="heading-6 text-platinum-50">
              Assistant de Virement SEPA
            </h2>
            <p className="caption-2 text-platinum-400 mt-1">
              Transfert instantané avec garantie d’idempotence et validation Modulo 97.
            </p>
          </div>
          <span className="self-start sm:self-auto caption-3 font-mono tabular-nums text-gold-400 bg-gold-400/10 px-3 py-1 rounded-md border border-gold-400/25">
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
              <div key={step.key} className="flex flex-col items-start text-left">
                <div
                  className={`w-full h-1.5 rounded-full mb-2 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : isCurrent
                      ? 'bg-gold-400'
                      : 'bg-obsidian-800'
                  }`}
                />
                <div className="hidden sm:flex items-center gap-1.5 caption-4">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isCompleted
                        ? 'text-emerald-500'
                        : isCurrent
                        ? 'text-gold-400'
                        : 'text-platinum-500'
                    }`}
                  />
                  <span
                    className={
                      isCompleted
                        ? 'text-platinum-200'
                        : isCurrent
                        ? 'text-platinum-50 font-semibold'
                        : 'text-platinum-500'
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
      <div>
        {currentStep === 'beneficiary' && <StepBeneficiary />}
        {currentStep === 'amount' && <StepAmount />}
        {currentStep === 'review' && <StepReview />}
        {currentStep === 'mfa' && <StepMfa />}
        {currentStep === 'success' && <StepSuccess onGoToHistory={onGoToHistory} />}
      </div>
    </Card>
  );
};
