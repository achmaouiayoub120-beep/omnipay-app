import React, { useState, useId } from 'react';
import { Search, UserPlus, CheckCircle2, AlertCircle, Building2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTransferStore } from '../transfers.store';
import { validateIban, maskIban } from '../../../shared/lib/iban';
import { Beneficiary } from '../transfers.types';

export const StepBeneficiary: React.FC = () => {
  const { beneficiaries, draft, selectBeneficiary, addCustomBeneficiary, setStep } = useTransferStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New beneficiary form state
  const [newName, setNewName] = useState('');
  const [newIban, setNewIban] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const searchInputId = useId();
  const newNameId = useId();
  const newIbanId = useId();

  // Filtered beneficiaries
  const filtered = beneficiaries.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.iban.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Real-time IBAN validation
  const ibanValidation = newIban.length >= 4 ? validateIban(newIban) : null;

  const handleSelectExisting = (beneficiary: Beneficiary) => {
    selectBeneficiary(beneficiary);
    setStep('amount');
  };

  const handleAddNewBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim()) {
      setFormError('Le nom du titulaire est requis.');
      return;
    }

    try {
      const added = addCustomBeneficiary(newName, newIban);
      selectBeneficiary(added);
      setStep('amount');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'IBAN invalide');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <label htmlFor={searchInputId} className="sr-only">
            Rechercher un bénéficiaire
          </label>
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id={searchInputId}
            type="text"
            placeholder="Rechercher par nom, IBAN ou banque..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070A12] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-gold)] transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{showAddForm ? 'Liste des contacts' : 'Nouveau compte / IBAN'}</span>
        </button>
      </div>

      {/* Add new beneficiary form */}
      {showAddForm ? (
        <form
          onSubmit={handleAddNewBeneficiary}
          className="bg-[#070A12]/90 border border-[var(--color-gold)]/30 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h4 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[var(--color-gold)]" />
              Saisie et validation sécurisée IBAN
            </h4>
            <span className="text-xs text-gray-400">Algorithme ISO 7064 Mod-97</span>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor={newNameId} className="block text-xs font-medium text-gray-300 mb-1.5">
                Nom complet du titulaire ou raison sociale *
              </label>
              <input
                id={newNameId}
                type="text"
                placeholder="Ex. Alice Dupont ou Entreprise SAS"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#0B101E] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={newIbanId} className="block text-xs font-medium text-gray-300">
                  Numéro de compte international (IBAN) *
                </label>
                {ibanValidation && (
                  <span
                    className={`text-xs inline-flex items-center gap-1 font-medium ${
                      ibanValidation.isValid
                        ? 'text-[var(--color-emerald)]'
                        : 'text-[var(--color-crimson)]'
                    }`}
                  >
                    {ibanValidation.isValid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Clé Modulo-97 validée ({ibanValidation.countryCode})</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Clé de contrôle invalide</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <input
                id={newIbanId}
                type="text"
                placeholder="FR76 •••• •••• •••• •••• •••• •••"
                value={newIban}
                onChange={(e) => setNewIban(e.target.value.toUpperCase())}
                className={`w-full bg-[#0B101E] border rounded-xl px-4 py-2.5 text-sm font-mono text-white tracking-wider focus:outline-none transition-colors ${
                  ibanValidation?.isValid
                    ? 'border-[var(--color-emerald)]/60 focus:border-[var(--color-emerald)]'
                    : ibanValidation && !ibanValidation.isValid
                    ? 'border-[var(--color-crimson)]/60 focus:border-[var(--color-crimson)]'
                    : 'border-white/10 focus:border-[var(--color-gold)]'
                }`}
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Les identifiants internes ACC-xxx ne sont jamais des IBAN. Saisissez un format SEPA valide (ex: FR76...).
              </p>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-[var(--color-crimson)]/10 border border-[var(--color-crimson)]/30 rounded-xl flex items-center gap-2 text-xs text-[var(--color-crimson)]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!ibanValidation?.isValid}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-[#070A12] shadow-lg shadow-[var(--color-gold)]/20 hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Enregistrer et continuer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      ) : null}

      {/* Beneficiary list */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">
          Bénéficiaires enregistrés & vérifiés ({filtered.length})
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 bg-[#070A12]/50 border border-white/5 rounded-2xl">
            <Building2 className="w-8 h-8 mx-auto text-gray-500 mb-2 opacity-50" />
            <p className="text-sm text-gray-400">Aucun bénéficiaire correspondant trouvé.</p>
            <p className="text-xs text-gray-500 mt-1">
              Cliquez sur &quot;Nouveau compte / IBAN&quot; pour ajouter un destinataire.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filtered.map((b) => {
              const isSelected = draft.beneficiary?.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => handleSelectExisting(b)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectExisting(b);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`group w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-gold)]/10 border-[var(--color-gold)]/50 shadow-md shadow-[var(--color-gold)]/10'
                      : 'bg-[#0B101E]/80 border-white/5 hover:border-white/20 hover:bg-[#0F1626]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-transform group-hover:scale-105 ${
                        isSelected
                          ? 'bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-light)] text-[#070A12]'
                          : 'bg-white/5 text-[var(--color-gold)] border border-white/10'
                      }`}
                    >
                      {b.avatarInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white truncate group-hover:text-[var(--color-gold)] transition-colors">
                          {b.name}
                        </span>
                        {b.isRecent && (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] border border-[var(--color-emerald)]/20 rounded-md">
                            Récent
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-gray-400 truncate mt-0.5">
                        {maskIban(b.iban)}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate mt-0.5">
                        {b.bankName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors hidden sm:inline">
                      Sélectionner
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-[var(--color-gold)] text-[#070A12] border-[var(--color-gold)]'
                          : 'border-white/10 text-gray-400 group-hover:border-[var(--color-gold)] group-hover:text-[var(--color-gold)]'
                      }`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
