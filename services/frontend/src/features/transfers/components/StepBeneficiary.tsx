import React, { useState, useId } from 'react';
import {
  MagnifyingGlass,
  UserPlus,
  CheckCircle,
  WarningCircle,
  Buildings,
  ShieldCheck,
  ArrowRight,
} from '@phosphor-icons/react';
import { useTransferStore } from '../transfers.store';
import { validateIban, maskIban } from '../../../shared/lib/iban';
import { Beneficiary } from '../transfers.types';
import { Button } from '@/shared/ui';

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

  const filtered = beneficiaries.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.iban.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-platinum-400 pointer-events-none" />
          <input
            id={searchInputId}
            type="text"
            placeholder="Rechercher par nom, IBAN ou banque..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-obsidian-950 border border-obsidian-700 rounded-lg pl-10 pr-4 body-6 text-platinum-50 placeholder-platinum-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-10"
        >
          <UserPlus className="w-4 h-4 shrink-0" />
          <span>{showAddForm ? 'Liste des contacts' : 'Nouveau compte / IBAN'}</span>
        </Button>
      </div>

      {/* Add new beneficiary form */}
      {showAddForm && (
        <form
          onSubmit={handleAddNewBeneficiary}
          className="bg-obsidian-950/90 border border-gold-400/35 rounded-xl p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-obsidian-700/60">
            <h4 className="title-3 text-platinum-50 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gold-400 shrink-0" />
              <span>Saisie et validation sécurisée IBAN</span>
            </h4>
            <span className="caption-5 font-mono text-platinum-400">Algorithme ISO 7064 Mod 97</span>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor={newNameId} className="block caption-3 text-platinum-200 mb-1.5">
                Nom complet du titulaire ou raison sociale
              </label>
              <input
                id={newNameId}
                type="text"
                placeholder="Ex. Alice Dupont ou Entreprise SAS"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full h-10 bg-obsidian-900 border border-obsidian-700 rounded-lg px-3.5 body-6 text-platinum-50 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
                required
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label htmlFor={newIbanId} className="block caption-3 text-platinum-200">
                  Numéro de compte international (IBAN)
                </label>
                {ibanValidation && (
                  <span
                    className={`caption-4 inline-flex items-center gap-1 ${
                      ibanValidation.isValid ? 'text-emerald-500' : 'text-crimson-500'
                    }`}
                  >
                    {ibanValidation.isValid ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Clé Modulo 97 validée ({ibanValidation.countryCode})</span>
                      </>
                    ) : (
                      <>
                        <WarningCircle className="w-4 h-4" />
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
                className={`w-full h-10 bg-obsidian-900 border rounded-lg px-3.5 body-6 font-mono text-platinum-50 tracking-wider focus:outline-none transition-colors ${
                  ibanValidation?.isValid
                    ? 'border-emerald-500/60 focus:border-emerald-500'
                    : ibanValidation && !ibanValidation.isValid
                    ? 'border-crimson-500/60 focus:border-crimson-500'
                    : 'border-obsidian-700 focus:border-gold-400'
                }`}
                required
              />
              <p className="caption-5 text-platinum-400 mt-1.5">
                Les identifiants internes ne sont pas des IBAN. Saisissez un format SEPA valide (ex. FR76).
              </p>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-crimson-500/10 border border-crimson-500/30 rounded-lg flex items-center gap-2 caption-4 text-crimson-500">
              <WarningCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!ibanValidation?.isValid}
            >
              <span>Enregistrer et continuer</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Button>
          </div>
        </form>
      )}

      {/* Beneficiary list */}
      <div className="space-y-3">
        <div className="caption-3 text-platinum-400">
          Bénéficiaires enregistrés et vérifiés ({filtered.length})
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 bg-obsidian-950/60 border border-obsidian-700/60 rounded-xl space-y-2">
            <Buildings className="w-8 h-8 mx-auto text-platinum-500" />
            <p className="body-5 text-platinum-200">Aucun bénéficiaire correspondant.</p>
            <p className="caption-5 text-platinum-400">
              Utilisez « Nouveau compte / IBAN » pour ajouter un destinataire.
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
                  className={`group w-full text-left p-4 rounded-xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.99] flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-gold-400/10 border-gold-400/50'
                      : 'bg-obsidian-950/60 border-obsidian-700/70 hover:border-gold-400/40 hover:bg-obsidian-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center caption-3 shrink-0 transition-colors duration-300 ${
                        isSelected
                          ? 'bg-gold-400 text-obsidian-950'
                          : 'bg-obsidian-800 text-gold-400 border border-obsidian-700'
                      }`}
                    >
                      {b.avatarInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="body-4 text-platinum-50 truncate group-hover:text-gold-400 transition-colors">
                          {b.name}
                        </span>
                        {b.isRecent && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 rounded-md">
                            Récent
                          </span>
                        )}
                      </div>
                      <div className="caption-5 font-mono tabular-nums text-platinum-400 truncate mt-0.5">
                        {maskIban(b.iban)}
                      </div>
                      <div className="caption-5 text-platinum-500 truncate mt-0.5">
                        {b.bankName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="caption-4 text-platinum-400 group-hover:text-platinum-50 transition-colors hidden sm:inline">
                      Sélectionner
                    </span>
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors duration-300 ${
                        isSelected
                          ? 'bg-gold-400 text-obsidian-950 border-gold-400'
                          : 'border-obsidian-700 text-platinum-400 group-hover:border-gold-400 group-hover:text-gold-400'
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
