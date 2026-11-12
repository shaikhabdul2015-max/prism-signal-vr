import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PRISM SIGNAL] Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950 text-slate-200">
          <div className="w-full max-w-md p-6 bg-slate-900/90 border border-red-500/60 rounded-xl shadow-2xl text-center">
            <div className="inline-flex p-3 rounded-full bg-red-950/80 border border-red-700/60 text-red-400 mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-lg font-bold font-mono tracking-wider text-white uppercase mb-2">
              RELAY CHAMBER ANOMALY
            </h1>

            <p className="text-xs font-sans text-slate-300 leading-relaxed mb-4">
              An unexpected disturbance was detected in the resonance matrix telemetry. Your chamber state is preserved.
            </p>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-left text-[11px] font-mono text-red-300/90 mb-5 overflow-x-auto max-h-32">
              {this.state.error?.message || 'Unknown runtime error'}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-mono text-slate-200 transition-colors"
              >
                ATTEMPT RECOVERY
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-mono font-bold text-xs rounded-lg transition-all shadow-md shadow-cyan-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RELOAD CHAMBER</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
