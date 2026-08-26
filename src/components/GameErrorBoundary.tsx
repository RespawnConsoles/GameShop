import { Component, type ReactNode } from 'react';

interface GameErrorBoundaryProps {
  onExit: () => void;
  children: ReactNode;
}

interface GameErrorBoundaryState {
  error: Error | null;
}

/** Mount with `key={gameId}` from the caller so switching games remounts a fresh boundary. */
export class GameErrorBoundary extends Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  state: GameErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): GameErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Game crashed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-black p-10 text-center text-white">
          <p className="text-xl font-bold text-rose-400">This game hit an unexpected error</p>
          <p className="max-w-sm text-sm text-white/50">{this.state.error.message}</p>
          <button
            onClick={this.props.onExit}
            className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            ← Return to Store
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
