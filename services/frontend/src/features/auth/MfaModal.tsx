import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
} from '@/shared/ui';
import { useAuthStore } from './auth.store';
import { ShieldCheck, Lock } from '@phosphor-icons/react';

export function MfaModal() {
  const { requiresMfa, pendingUsername, verifyMfa, logout } = useAuthStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!requiresMfa) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Veuillez saisir un code à 6 chiffres valide.');
      return;
    }

    try {
      setIsVerifying(true);
      await verifyMfa(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la validation MFA.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={requiresMfa}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-gold-400 mb-1">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <span className="caption-3 tracking-wide">
              Double authentification MFA
            </span>
          </div>
          <DialogTitle className="heading-6 text-platinum-50">
            Validation forte de session
          </DialogTitle>
          <DialogDescription>
            Un code de sécurité à 6 chiffres est requis pour le compte{' '}
            <strong className="text-platinum-50">{pendingUsername}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Input
            label="Code de vérification TOTP"
            placeholder="Ex : 482910"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            error={error || undefined}
            leftIcon={<Lock className="h-4 w-4" />}
            autoFocus
            helperText="Simulation : saisissez n'importe quel code à 6 chiffres."
          />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={logout}
              disabled={isVerifying}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isVerifying}
              disabled={code.length !== 6}
            >
              Valider la connexion
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
