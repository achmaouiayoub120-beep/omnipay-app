import React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle, WarningCircle, Warning, Info, X } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import { useToastStore, ToastKind } from './toast.store';

/**
 * Couleurs sémantiques de la charte S4 (indépendantes du thème Obsidian & Champagne) :
 * vert #10b981 (confirmé), rouge #ef4444 (rejeté), jaune #facc15 (doublon / idempotence), bleu #38bdf8 (information).
 */
export const TOAST_STYLES: Record<ToastKind, { accent: string; border: string; icon: React.ElementType; label: string }> = {
  success: { accent: 'text-[#10b981]', border: 'border-l-[#10b981]', icon: CheckCircle, label: 'Succès' },
  error: { accent: 'text-[#ef4444]', border: 'border-l-[#ef4444]', icon: WarningCircle, label: 'Rejet' },
  warning: { accent: 'text-[#facc15]', border: 'border-l-[#facc15]', icon: Warning, label: 'Attention' },
  info: { accent: 'text-[#38bdf8]', border: 'border-l-[#38bdf8]', icon: Info, label: 'Information' },
};

export const Toaster: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <ToastPrimitive.Provider swipeDirection="right" label="Notifications">
      {toasts.map((t) => {
        const style = TOAST_STYLES[t.kind];
        const Icon = style.icon;
        return (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.durationMs}
            data-kind={t.kind}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border border-white/10 border-l-4 bg-[#0f172a] p-4 shadow-elevation-3',
              style.border
            )}
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.accent)} weight="fill" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-1">
              <ToastPrimitive.Title className="text-sm font-semibold text-white">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="break-words text-sm text-slate-200">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              aria-label="Fermer la notification"
              className="shrink-0 cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="fixed bottom-5 right-5 z-[70] flex w-[min(92vw,26rem)] flex-col gap-3 outline-none" />
    </ToastPrimitive.Provider>
  );
};
