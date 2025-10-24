import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report to monitoring service if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center p-8 bg-gray-800 rounded-lg shadow-lg max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-4">Bir Hata Oluştu</h2>
            <p className="text-gray-300 mb-6">
              Uygulamada beklenmedik bir hata meydana geldi. Lütfen sayfayı yenileyin.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-gray-700 p-4 rounded mb-4">
                <summary className="cursor-pointer font-semibold">Hata Detayları (Geliştirici)</summary>
                <pre className="text-xs mt-2 overflow-auto text-red-300">
                  {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      <br />
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;