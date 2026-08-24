import { CheckCircle2 } from 'lucide-react';

export function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg border border-emerald-500/30 bg-[#15161c] px-4 py-2.5 text-sm text-white shadow-xl">
      <CheckCircle2 size={16} className="text-emerald-400" />
      {message}
    </div>
  );
}
