"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-text-muted mb-2 font-medium">Algo deu errado.</p>
            <button
              className="text-sm text-red underline"
              onClick={() => this.setState({ hasError: false })}
            >
              Tentar novamente
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
