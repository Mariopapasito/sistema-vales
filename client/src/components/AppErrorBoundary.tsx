import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export default class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[UI] Error no controlado:', error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-fatal-error" role="alert">
          <img src="/loading-flame.png" alt="" />
          <h1>No pudimos mostrar esta pantalla</h1>
          <p>La información no se perdió. Recarga la aplicación para volver a intentarlo.</p>
          <button type="button" className="btn btn-primary" onClick={this.reload}>Recargar aplicación</button>
        </main>
      );
    }

    return this.props.children;
  }
}
