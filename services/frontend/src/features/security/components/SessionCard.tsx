import React from 'react';
import { Monitor, DeviceMobile, Laptop, Trash, ShieldCheck, MapPin } from '@phosphor-icons/react';
import { ActiveSession } from '../security.types';
import { Button } from '@/shared/ui';

interface SessionCardProps {
  session: ActiveSession;
  onRevoke: (id: string) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onRevoke }) => {
  const getDeviceIcon = () => {
    const text = (session.deviceName + session.browser + session.os).toLowerCase();
    if (text.includes('iphone') || text.includes('android') || text.includes('mobile')) {
      return DeviceMobile;
    }
    if (text.includes('macbook') || text.includes('laptop')) {
      return Laptop;
    }
    return Monitor;
  };

  const Icon = getDeviceIcon();

  return (
    <div
      className={`p-4 rounded-xl border transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        session.isCurrent
          ? 'bg-obsidian-800/80 border-gold-400/40'
          : 'bg-obsidian-950/70 border-obsidian-700/70 hover:border-obsidian-600'
      }`}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            session.isCurrent
              ? 'bg-gold-400/10 text-gold-400 border border-gold-400/30'
              : 'bg-obsidian-900 text-platinum-400 border border-obsidian-700'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="body-4 text-platinum-50 truncate">
              {session.deviceName}
            </h4>
            {session.isCurrent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                Session actuelle
              </span>
            )}
          </div>

          <div className="caption-5 text-platinum-400 mt-0.5">
            {session.browser} · {session.os}
          </div>

          <div className="flex flex-wrap items-center gap-3 caption-5 text-platinum-500 mt-1 font-mono tabular-nums">
            <span>{session.ipAddress}</span>
            <span className="inline-flex items-center gap-1 font-sans">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {session.location}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end shrink-0 sm:ml-4">
        {session.isCurrent ? (
          <span className="caption-4 text-platinum-400">Connecté</span>
        ) : (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => onRevoke(session.id)}
            className="bg-crimson-500/10 text-crimson-500 border-crimson-500/30 hover:bg-crimson-500 hover:text-white"
          >
            <Trash className="w-3.5 h-3.5 shrink-0" />
            <span>Révoquer l’accès</span>
          </Button>
        )}
      </div>
    </div>
  );
};
