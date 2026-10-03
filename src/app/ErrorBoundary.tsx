import { Component, type ReactNode } from "react";
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main>
          <h1>LocalRelay could not open this screen</h1>
          <p>
            Your saved data has not been intentionally deleted. Reload the
            application; if the error persists, use direct contact and keep the
            original SMS messages.
          </p>
          <button onClick={() => location.reload()}>Reload app</button>
        </main>
      );
    return this.props.children;
  }
}
