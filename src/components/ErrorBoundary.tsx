"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
          <p className="text-white/60 text-sm mb-4 max-w-md">
            We encountered an unexpected error. Please try again.
          </p>
          <Button onClick={this.handleRetry} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Image-specific error boundary with better UX
export function ImageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="aspect-square bg-white/5 rounded-xl flex items-center justify-center">
          <div className="text-center p-4">
            <AlertTriangle className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="text-white/40 text-sm">Failed to load image</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Gallery-specific error boundary
export function GalleryErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400/60 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Gallery Error</h3>
          <p className="text-white/60 text-sm mb-4">
            There was a problem loading the gallery. Please refresh the page.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh page
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Generator-specific error boundary
export function GeneratorErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Generator Error</h3>
          <p className="text-white/60 text-sm mb-4">
            The generator encountered an error. Your credits were not deducted.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload generator
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
