import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  componentName?: string;
}
interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ errorInfo: info });
    // Log structuré pour debug remote
    console.error('[ErrorBoundary] Crash dans', this.props.componentName || 'inconnu', {
      message: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: info.componentStack?.slice(0, 500)
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0a1628', color: 'white', padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            Erreur inattendue
          </h1>
          <p style={{ color: '#94a3b8', maxWidth: 400, marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'Une erreur est survenue. Rechargez la page.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={this.handleReset}
              style={{ padding: '0.75rem 1.5rem', background: '#d4af37', color: '#000',
                fontWeight: 900, borderRadius: 12, border: 'none', cursor: 'pointer' }}
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '0.75rem 1.5rem', background: '#1e3a5f', color: '#fff',
                fontWeight: 900, borderRadius: 12, border: 'none', cursor: 'pointer' }}
            >
              Recharger l'app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
