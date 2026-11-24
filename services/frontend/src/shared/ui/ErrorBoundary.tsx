import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCw, ShieldCheck } from 'lucide-react';
import { Button } from './button/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[OmniPay Zero-Trust] Uncaught UI error intercepted by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearSession = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#070A12] flex items-center justify-center p-6 text-white font-sans">
          <div className="w-full max-w-lg bg-[#0B101E] border border-[var(--color-crimson)]/40 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-crimson)]/10 text-[var(--color-crimson)] border border-[var(--color-crimson)]/30 flex items-center justify-center">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Incident d'Interface Intercepté
              </h2>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Le bouclier Zero-Trust de l'application bancaire a isolé cette anomalie de rendu pour préserver l'intégrité de votre session.
              </p>
            </div>

            {/* Error message detail */}
            {this.state.error && (
              <div className="p-3 bg-[#070A12] border border-white/5 rounded-xl font-mono text-[11px] text-[var(--color-crimson)] text-left truncate">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleClearSession}
                className="w-full sm:w-auto text-xs"
              >
                Réinitialiser la session
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                className="w-full sm:w-auto text-xs cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                <span>Recharger l'application</span>
              </Button>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-emerald)]" />
              <span>OmniPay Zero-Trust ESTC · Fault-Tolerant UI Guardian</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
