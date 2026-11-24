import React from 'react';
import { Monitor, Smartphone, Laptop, Trash2, ShieldCheck, MapPin } from 'lucide-react';
import { ActiveSession } from '../security.types';

interface SessionCardProps {
  session: ActiveSession;
  onRevoke: (id: string) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onRevoke }) => {
  const getDeviceIcon = () => {
    const text = (session.deviceName + session.browser + session.os).toLowerCase();
    if (text.includes('iphone') || text.includes('android') || text.includes('mobile')) {
      return Smartphone;
    }
    if (text.includes('macbook') || text.includes('laptop')) {
      return Laptop;
    }
    return Monitor;
  };

  const Icon = getDeviceIcon();

  return (
    <div
      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        session.isCurrent
          ? 'bg-[#0B101E] border-[var(--color-gold)]/40 shadow-md shadow-[var(--color-gold)]/5'
          : 'bg-[#070A12] border-white/5 hover:border-white/10'
      }`}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            session.isCurrent
              ? 'bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30'
              : 'bg-white/5 text-gray-400 border border-white/10'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white truncate">
              {session.deviceName}
            </h4>
            {session.isCurrent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] border border-[var(--color-emerald)]/20">
                <ShieldCheck className="w-3 h-3" />
                Session Actuelle
              </span>
            )}
          </div>

          <div className="text-xs text-gray-400 mt-0.5">
            {session.browser} · {session.os}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1 font-mono">
            <span>{session.ipAddress}</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {session.location}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end shrink-0 sm:ml-4">
        {session.isCurrent ? (
          <span className="text-[11px] text-gray-400 font-medium">Connecté maintenant</span>
        ) : (
          <button
            type="button"
            onClick={() => onRevoke(session.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--color-crimson)] bg-[var(--color-crimson)]/10 border border-[var(--color-crimson)]/20 hover:bg-[var(--color-crimson)]/20 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Révoquer l'accès</span>
          </button>
        )}
      </div>
    </div>
  );
};
