import { Heart, Library, Store } from 'lucide-react';

export type View = 'store' | 'library' | 'wishlist';

interface SidebarProps {
  view: View;
  onChange: (view: View) => void;
}

const ITEMS: { id: View; label: string; icon: typeof Store }[] = [
  { id: 'store', label: 'Store', icon: Store },
  { id: 'library', label: 'My Library', icon: Library },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
];

export function Sidebar({ view, onChange }: SidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-white/5 bg-black/20 p-3">
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
            view === id ? 'bg-emerald-600/15 text-emerald-400' : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </aside>
  );
}
