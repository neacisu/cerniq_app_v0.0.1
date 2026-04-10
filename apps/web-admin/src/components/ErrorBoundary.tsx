import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportAdminClientError } from "../lib/report-client-error.js";

type Props = { readonly children: ReactNode };
type State = { readonly hasError: boolean; readonly error?: Error };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary (admin):", error, errorInfo);
    void reportAdminClientError({
      message: error.message,
      name: error.name,
      stack: error.stack,
      source: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "50vh",
            padding: "2rem",
            textAlign: "center",
            color: "#e5e5e7",
            background: "#0f1117",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>A apărut o eroare</h2>
          <p style={{ fontSize: "0.875rem", color: "#a0a0a8", marginBottom: "1rem" }}>
            {this.state.error?.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              borderRadius: "0.5rem",
              border: "1px solid #2a2d35",
              background: "rgba(212,168,69,0.15)",
              color: "#d4a845",
              cursor: "pointer",
            }}
          >
            Încearcă din nou
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
