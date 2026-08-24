import { KeyRound } from 'lucide-react';

export function ApiKeyNotice() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <KeyRound size={32} className="text-white/20" />
      <h2 className="text-lg font-semibold text-white">RAWG API key needed</h2>
      <p className="max-w-sm text-sm text-white/50">
        Get a free key at{' '}
        <span className="text-emerald-400">rawg.io/apidocs</span>, then add it to the{' '}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">.env</code> file as{' '}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">VITE_RAWG_API_KEY</code> and restart the app.
      </p>
    </div>
  );
}
