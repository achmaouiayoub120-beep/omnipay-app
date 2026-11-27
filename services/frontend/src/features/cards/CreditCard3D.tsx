import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CardDTO } from './cards.types';
import { useCardsStore } from './cards.store';
import { Button } from '@/shared/ui';
import { Eye, EyeSlash, Snowflake, Flame, Clock } from '@phosphor-icons/react';
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
  const [shine, setShine] = useState({ x: 0, y: 0, active: false });
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

  // Moteur d'inclinaison 3D maîtrisé et reflet métallique sans dégradé de fond
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateY = ((x - centerX) / centerX) * 9;
      const rotateX = -((y - centerY) / centerY) * 9;

      const offsetX = ((x - centerX) / centerX) * 28;
      const offsetY = ((y - centerY) / centerY) * 28;

      setTilt({ rotateX, rotateY });
      setShine({ x: offsetX, y: offsetY, active: true });
    },
    [prefersReducedMotion]
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setShine({ x: 0, y: 0, active: false });
  }, []);

  const handleToggleReveal = () => {
    if (card.isFrozen) return;
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
        className="w-full aspect-[1.586/1] select-none"
        style={{ perspective: '1100px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={cardRef}
          className={cn(
            'relative w-full h-full rounded-xl overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-card-specular border border-gold-400/40',
            card.isFrozen && 'filter grayscale contrast-75 brightness-75'
          )}
          style={{
            transform: prefersReducedMotion
              ? 'none'
              : `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* 1. Texture métallique officielle OmniPay */}
          <img
            src="/cards/ultra-platinum.jpg"
            alt="Carte bancaire OmniPay Ultra Platinum Visa Infinite"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Voile de contraste fixe sombre sur la carte physique */}
          <div className="absolute inset-0 bg-[#070A12]/40 pointer-events-none" />

          {/* 2. Reflet spéculaire champagne (transform + opacity uniquement, zéro gradient) */}
          {!prefersReducedMotion && (
            <div
              className="absolute -inset-12 pointer-events-none transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                opacity: shine.active ? 0.14 : 0,
                transform: `translate3d(${shine.x}px, ${shine.y}px, 0) rotate(22deg)`,
                backgroundColor: '#DEC08C',
                width: '45%',
                filter: 'blur(36px)',
              }}
            />
          )}

          {/* Filet intérieur métallique */}
          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/15 pointer-events-none" />

          {/* 3. Couche Produit Réel : Bouton Yeux, PAN, Titulaire, Expiration, CVV & VISA (sans chevaucher la puce, le NFC ni le logo intégrés) */}
          <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between z-10 pointer-events-none">
            {/* Rangée Haute : Gamme + Bouton Yeux à gauche (droite libre pour le logo OmniPay intégré) */}
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-2 pointer-events-auto">
                <span className="caption-3 tracking-widest text-[#DEC08C] bg-[#070A12]/80 px-2.5 py-0.5 rounded-md border border-[#D4A24C]/40">
                  {card.type.replace('_', ' ')}
                </span>

                {canManage && (
                  <button
                    type="button"
                    onClick={handleToggleReveal}
                    disabled={card.isFrozen}
                    title={isRevealed ? 'Masquer les informations de la carte' : 'Afficher le numéro et le CVV (10s)'}
                    aria-label={isRevealed ? 'Masquer les informations de la carte' : 'Afficher les informations de la carte'}
                    className="h-7 w-7 rounded-md bg-[#070A12]/80 border border-[#D4A24C]/45 text-[#DEC08C] hover:bg-[#D4A24C] hover:text-[#070A12] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.96] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isRevealed ? (
                      <EyeSlash className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}

                {card.isFrozen && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-[#CE2C31] text-white rounded-md caption-4 shadow-elevation-2">
                    <Snowflake className="h-3.5 w-3.5" />
                    <span>Gelée</span>
                  </div>
                )}
              </div>
            </div>

            {/* Zone Basse (dégagée sous la puce EMV et le sans-contact intégrés) : Numéro PAN + Infos + VISA */}
            <div className="mt-auto space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-base sm:text-lg font-semibold tracking-[0.16em] text-[#F5F5F5] tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                  {isRevealed ? card.fullPan : card.maskedPan}
                </div>

                {isRevealed && (
                  <div className="inline-flex items-center gap-1 caption-5 text-[#DEC08C] bg-[#070A12]/85 px-2 py-0.5 rounded-md border border-[#D4A24C]/45">
                    <Clock className="h-3 w-3" />
                    <span className="tabular-nums font-mono">{revealTimeRemaining}s</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end text-[#E2E8F0] gap-3">
                <div className="flex items-end gap-3.5 sm:gap-4 min-w-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="caption-5 text-[#9CA3AF]">
                      Titulaire
                    </div>
                    <div className="caption-3 text-[#F5F5F5] tracking-wide truncate">
                      {card.cardholderName}
                    </div>
                  </div>

                  <div className="space-y-0.5 shrink-0">
                    <div className="caption-5 text-[#9CA3AF]">
                      Expire
                    </div>
                    <div className="font-mono caption-3 text-[#F5F5F5] tabular-nums">
                      {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear}
                    </div>
                  </div>

                  <div className="space-y-0.5 shrink-0">
                    <div className="caption-5 text-[#9CA3AF]">
                      CVV
                    </div>
                    <div
                      className={cn(
                        'font-mono caption-3 tabular-nums',
                        isRevealed
                          ? 'text-[#DEC08C] bg-[#070A12]/85 px-1.5 rounded border border-[#D4A24C]/50'
                          : 'text-[#F5F5F5]'
                      )}
                    >
                      {isRevealed ? card.cvv : '•••'}
                    </div>
                  </div>
                </div>

                {/* Marque Réseau VISA Infinite */}
                <div className="flex flex-col items-end shrink-0 leading-none bg-[#070A12]/70 px-2 py-1 rounded-md border border-[#D4A24C]/25">
                  <span className="font-sans font-bold text-base sm:text-lg tracking-wider text-[#F5F5F5]">
                    VISA
                  </span>
                  <span className="text-xs font-medium tracking-wider text-[#DEC08C]">
                    Infinite
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Barre d'actions sous la carte (masquée pour ROLE_AUDITOR) */}
      {canManage && (
        <div className="flex items-center justify-between gap-3 w-full">
          <Button
            variant={card.isFrozen ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => toggleFreeze(card.id)}
            className="flex-1"
          >
            {card.isFrozen ? (
              <>
                <Flame className="h-4 w-4 shrink-0" />
                <span>Dégeler la carte</span>
              </>
            ) : (
              <>
                <Snowflake className="h-4 w-4 text-platinum-400 shrink-0" />
                <span>Geler la carte</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleReveal}
            className="flex-1"
            disabled={card.isFrozen}
          >
            {isRevealed ? (
              <>
                <EyeSlash className="h-4 w-4 shrink-0" />
                <span>Masquer</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 shrink-0" />
                <span>Révéler (10s)</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
