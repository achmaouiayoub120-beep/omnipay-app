import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CardDTO } from './cards.types';
import { useCardsStore } from './cards.store';
import { Button } from '@/shared/ui';
import { Eye, EyeOff, Snowflake, Flame, Clock } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface CreditCard3DProps {
  card: CardDTO;
  className?: string;
  canManage?: boolean;
}

export function CreditCard3D({ card, className, canManage = true }: CreditCard3DProps) {
  const { revealedCardId, revealTimeRemaining, toggleFreeze, revealPan, hidePan, decrementRevealTimer } =
    useCardsStore();
  const cardRef = useRef<HTMLDivElement>(null);

  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50, opacity: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const isRevealed = revealedCardId === card.id;

  // Détection prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  // Décompte automatique des 10 secondes de révélation
  useEffect(() => {
    if (!isRevealed) return;

    const timer = setInterval(() => {
      decrementRevealTimer();
    }, 1000);

    return () => clearInterval(timer);
  }, [isRevealed, decrementRevealTimer]);

  // Moteur d'inclinaison 3D Parallax & Reflet Spéculaire
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateY = ((x - centerX) / centerX) * 12; // Max 12deg
      const rotateX = -((y - centerY) / centerY) * 12;

      const shineX = (x / rect.width) * 100;
      const shineY = (y / rect.height) * 100;

      setTilt({ rotateX, rotateY });
      setShine({ x: shineX, y: shineY, opacity: 1 });
    },
    [prefersReducedMotion]
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setShine((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  const handleToggleReveal = () => {
    if (isRevealed) {
      hidePan();
    } else {
      revealPan(card.id);
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-4 w-full max-w-sm mx-auto', className)}>
      {/* Conteneur 3D avec perspective */}
      <div
        className="w-full aspect-[1.586/1] perspective-1000 select-none cursor-pointer"
        style={{ perspective: '1000px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={cardRef}
          className={cn(
            'relative w-full h-full rounded-2xl overflow-hidden transition-transform duration-150 ease-out shadow-card-specular border border-gold-400/30',
            card.isFrozen && 'filter grayscale contrast-75 brightness-75'
          )}
          style={{
            transform: prefersReducedMotion
              ? 'none'
              : `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* 1. Fond Illustré Officiel OmniPay (ultra-platinum.jpg) */}
          <img
            src="/cards/ultra-platinum.jpg"
            alt="OmniPay Ultra Platinum"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* 2. Calque Spéculaire Dynamique (Or & Lumière) */}
          {!prefersReducedMotion && (
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                opacity: shine.opacity,
                background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(212, 162, 76, 0.4) 0%, rgba(255, 255, 255, 0.12) 28%, transparent 65%)`,
                mixBlendMode: 'screen',
              }}
            />
          )}

          {/* 3. Couche Dynamique Vectorielle / Données Client (Z-Index Supérieur) */}
          <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-between z-10 pointer-events-none">
            {/* Haut de la carte : Logo texturé et type */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-widest text-gold-300 bg-obsidian-950/70 px-2 py-0.5 rounded border border-gold-400/40">
                  {card.type.replace('_', ' ')}
                </span>
              </div>

              {card.isFrozen && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-crimson-600/90 text-white rounded-md text-[10px] font-bold shadow-elevation-2 animate-pulse">
                  <Snowflake className="h-3 w-3" />
                  <span>CARTE GELÉE</span>
                </div>
              )}
            </div>

            {/* Milieu : Numéro de carte (masqué ou révélé) */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg sm:text-xl font-bold tracking-widest text-platinum-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {isRevealed ? card.fullPan : card.maskedPan}
                </span>
              </div>
              {isRevealed && (
                <div className="flex items-center gap-1 text-[11px] text-gold-300 font-semibold bg-obsidian-950/80 px-2 py-0.5 rounded w-fit border border-gold-400/40">
                  <Clock className="h-3 w-3 animate-spin" />
                  <span>Masquage automatique dans {revealTimeRemaining}s</span>
                </div>
              )}
            </div>

            {/* Bas : Titulaire, Expiration et CVV */}
            <div className="flex justify-between items-end text-platinum-200">
              <div className="space-y-0.5">
                <div className="text-[9px] uppercase tracking-wider text-platinum-400 font-semibold">
                  Titulaire
                </div>
                <div className="text-xs sm:text-sm font-bold tracking-wide text-platinum-50 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  {card.cardholderName}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="space-y-0.5 text-right">
                  <div className="text-[9px] uppercase tracking-wider text-platinum-400 font-semibold">
                    Expire
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-platinum-50 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear}
                  </div>
                </div>

                {isRevealed && (
                  <div className="space-y-0.5 text-right">
                    <div className="text-[9px] uppercase tracking-wider text-gold-400 font-semibold">
                      CVV
                    </div>
                    <div className="font-mono text-xs sm:text-sm font-bold text-gold-300 bg-obsidian-950/80 px-1.5 rounded border border-gold-400/50">
                      {card.cvv}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Barre d'actions sous la carte (Gel / Dégel & Révélation sécurisée - masquée pour les auditeurs) */}
      {canManage && (
        <div className="flex items-center justify-between gap-3 w-full px-1">
          <Button
            variant={card.isFrozen ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => toggleFreeze(card.id)}
            className="flex-1 text-xs cursor-pointer"
          >
            {card.isFrozen ? (
              <>
                <Flame className="h-3.5 w-3.5 text-gold-400 mr-1.5" />
                <span>Dégeler la carte</span>
              </>
            ) : (
              <>
                <Snowflake className="h-3.5 w-3.5 text-platinum-400 mr-1.5" />
                <span>Geler la carte</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleReveal}
            className="flex-1 text-xs cursor-pointer"
            disabled={card.isFrozen}
          >
            {isRevealed ? (
              <>
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                <span>Masquer</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                <span>Révéler (10s)</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
