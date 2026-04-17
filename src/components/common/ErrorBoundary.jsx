import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que el siguiente renderizado muestre la interfaz de repuesto
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // También puedes registrar el error en un servicio de reporte de errores
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Puedes renderizar cualquier interfaz de repuesto personalizada
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10.29 3.86 7.94 13.14a4 4 0 0 1-3.41 6H5.17a4 4 0 0 1-3.41-6L9.69 3.86a1.17 1.17 0 0 1 2.02 0z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <h1 className="error-boundary-title">¡Ups! Algo no salió bien</h1>
            <p className="error-boundary-text">
              La aplicación ha detectado un error inesperado. Hemos intentado proteger tu sesión, pero necesitamos reiniciar la vista.
            </p>
            <div className="error-boundary-actions">
              <button 
                className="error-boundary-btn-primary" 
                onClick={() => window.location.reload()}
              >
                Recargar Aplicación
              </button>
              <button 
                className="error-boundary-btn-secondary" 
                onClick={() => window.location.href = '/'}
              >
                Ir al Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
