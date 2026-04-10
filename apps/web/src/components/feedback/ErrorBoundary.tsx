import { Component, type ReactNode, type ErrorInfo } from "react";
import { reportClientError } from "../../lib/report-client-error.js";

interface Props {
  readonly children: ReactNode;
}
interface State {
  readonly hasError: boolean;
  readonly error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    void reportClientError({
      message: error.message,
      name: error.name,
      stack: error.stack,
      source: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-75 p-8 text-center">
          <h2 className="text-xl font-bold text-er mb-2">Something went wrong</h2>
          <p className="text-sm text-t3 mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 text-sm rounded-md bg-b5 text-s950"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
