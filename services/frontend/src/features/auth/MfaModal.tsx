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
import { ShieldCheck, Lock } from 'lucide-react';

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
          <div className="flex items-center gap-2.5 text-gold-400 mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Double Authentification (MFA)
            </span>
          </div>
          <DialogTitle>Validation Forte de Session</DialogTitle>
          <DialogDescription>
            Un code de sécurité à 6 chiffres a été généré pour le compte{' '}
            <strong className="text-platinum-100">{pendingUsername}</strong>.
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
            helperText="Code de simulation : saisissez n'importe quel code à 6 chiffres."
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={logout}
              disabled={isVerifying}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
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
