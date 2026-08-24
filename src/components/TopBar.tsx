import { Gamepad2, Plus, Search, Wallet } from 'lucide-react';
import { useStore } from '../lib/store';

interface TopBarProps {
  search: string;
  onSearch: (value: string) => void;
  showSearch: boolean;
}

export function TopBar({ search, onSearch, showSearch }: TopBarProps) {
  const { wallet, addFunds } = useStore();

  return (
    <div className="drag flex h-14 shrink-0 items-center gap-4 border-b border-white/5 bg-black/20 pl-20 pr-5">
      <div className="no-drag flex items-center gap-2">
        <Gamepad2 className="text-emerald-400" size={20} />
        <span className="text-sm font-bold tracking-tight text-white">GameShop</span>
      </div>
      {showSearch ? (
        <div className="no-drag relative ml-4 max-w-md flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search games…"
            className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <button
        onClick={() => addFunds(100)}
        className="no-drag flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/5 hover:text-white"
        title="Add mock funds"
      >
        <Plus size={13} />
        Add funds
      </button>
      <div className="no-drag flex items-center gap-1.5 rounded-md bg-emerald-600/15 px-3 py-1.5 text-sm font-medium text-emerald-400">
        <Wallet size={14} />${wallet.toFixed(2)}
      </div>
    </div>
  );
}
