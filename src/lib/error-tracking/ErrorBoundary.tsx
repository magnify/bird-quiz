'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to our error tracking system
    logError({
      type: 'react-error',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack ?? undefined,
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Noget gik galt</h2>
          <p>Fejlen er blevet logget og vil blive undersøgt.</p>
          <button onClick={() => window.location.reload()}>
            Genindlæs siden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Error logging function
export async function logError(errorData: {
  type: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const payload = {
      ...errorData,
      timestamp: errorData.timestamp || new Date().toISOString(),
      userAgent: errorData.userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : ''),
    };

    // Send to error logging endpoint
    await fetch('/api/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Silently fail - don't want error logging to break the app
    console.error('Failed to log error:', err);
  }
}

// Global error handler setup
if (typeof window !== 'undefined') {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError({
      type: 'unhandled-promise',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      url: window.location.href,
    });
  });

  // Global errors
  window.addEventListener('error', (event) => {
    // Skip ResizeObserver errors (browser bug, harmless)
    if (event.message.includes('ResizeObserver')) return;

    logError({
      type: 'global-error',
      message: event.message,
      stack: event.error?.stack,
      url: window.location.href,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
}
