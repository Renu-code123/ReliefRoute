import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import i18next from 'i18next';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">{i18next.t('sync.error_title')}</h1>
            <p className="text-slate-500 mb-6">
              {i18next.t('sync.error_desc')}
            </p>
            <div className="bg-slate-100 p-4 rounded text-left text-xs text-slate-700 font-mono overflow-auto mb-6 max-h-32">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={18} /> {i18next.t('sync.reload')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
