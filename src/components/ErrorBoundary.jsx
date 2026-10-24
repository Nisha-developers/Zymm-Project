import { Component } from "react";

// Catches render errors in a screen so the user sees a message instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error("Screen crashed:", err); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="grid h-full place-items-center p-8 text-center">
        <div>
          <h1 className="text-lg font-bold">Something went wrong</h1>
          <p className="mt-1 text-sm text-zinc-600">This screen hit an error. Go back home and try again.</p>
          <button onClick={this.props.onReset} className="mt-4 h-11 rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white">Go home</button>
        </div>
      </div>
    );
  }
}
