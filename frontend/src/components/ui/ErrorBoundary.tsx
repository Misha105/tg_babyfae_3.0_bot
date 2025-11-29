import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';
import i18n from '@/lib/i18n';

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
    logger.error('Uncaught error caught by ErrorBoundary', { error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      const t = i18n.t.bind(i18n);
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-red-900/20 p-4 rounded-full mb-4">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{t('error_boundary.title', 'Something went wrong')}</h1>
          <p className="text-slate-400 mb-6 max-w-xs">
            {t('error_boundary.message', 'We\'re sorry, but the application encountered an unexpected error.')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('error_boundary.reload', 'Reload Application')}
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-8 p-4 bg-black/50 rounded text-left text-xs text-red-300 overflow-auto max-w-full">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
