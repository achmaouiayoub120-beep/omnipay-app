import { Component, ErrorInfo, ReactNode } from 'react';
import { WarningOctagon, ArrowsClockwise, ShieldCheck } from '@phosphor-icons/react';
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
        <div className="min-h-[100dvh] bg-obsidian-950 surface-grain flex items-center justify-center p-6 text-platinum-50 font-sans">
          <div className="w-full max-w-lg bg-obsidian-900 border border-crimson-500/40 rounded-2xl p-8 shadow-elevation-3 text-center space-y-6">
            <div className="w-12 h-12 mx-auto rounded-xl bg-crimson-500/10 text-crimson-500 border border-crimson-500/30 flex items-center justify-center">
              <WarningOctagon className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="heading-6 text-platinum-50">
                Incident d'Interface Intercepté
              </h2>
              <p className="caption-2 text-platinum-400 max-w-md mx-auto">
                Le bouclier Zero-Trust de l'application bancaire a isolé cette anomalie de rendu pour préserver l'intégrité de votre session.
              </p>
            </div>

            {/* Error message detail */}
            {this.state.error && (
              <div className="p-3 bg-obsidian-950 border border-obsidian-700 rounded-lg font-mono text-xs text-crimson-500 text-left truncate">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleClearSession}
                className="w-full sm:w-auto"
              >
                Réinitialiser la session
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                className="w-full sm:w-auto"
              >
                <ArrowsClockwise className="w-4 h-4 mr-1.5" />
                <span>Recharger l'application</span>
              </Button>
            </div>

            <div className="pt-4 border-t border-obsidian-700/60 flex items-center justify-center gap-2 text-xs text-platinum-500 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>OmniPay Zero-Trust · Protection d'exécution UI</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
