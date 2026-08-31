import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ERRO CAPTURADO:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg border-2 border-red-200 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
            <h1 className="text-2xl font-black text-red-900 mb-3">Ops! Algo deu errado</h1>
            <p className="text-sm text-red-700 mb-4">Um erro inesperado aconteceu. Por favor, recarregue a página.</p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-xs font-mono text-red-800 break-all">{this.state.error?.message || 'Erro desconhecido'}</p>
            </div>
            <button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition">
              🔄 Recarregar Página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);