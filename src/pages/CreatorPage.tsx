import { useState } from 'react';
import { ChevronLeft, Trash2, Trophy, Wand2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { CATALOG } from '../lib/catalog';
import type { Studio, StudioGame } from '../lib/types';

function CreateAccountForm() {
  const { createAccount } = useStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <Wand2 size={32} className="text-white/20" />
      <h2 className="text-lg font-semibold text-white">Create your Creator account</h2>
      <p className="max-w-sm text-sm text-white/50">
        Set up an account to create studios, link games to them, and manage achievements.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim() || !name.trim()) return;
          createAccount(email.trim(), name.trim());
        }}
        className="flex w-full max-w-xs flex-col gap-3"
      >
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none"
        />
        <input
          type="text"
          required
          placeholder="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Create Account
        </button>
      </form>
    </div>
  );
}

function NewStudioForm() {
  const { createStudio } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex h-full min-h-[110px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 text-white/40 hover:border-white/30 hover:text-white/70"
      >
        <span className="text-2xl leading-none">+</span>
        <span className="text-xs">New Studio</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        createStudio(name.trim());
        setName('');
        setOpen(false);
      }}
      className="flex min-h-[110px] flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3"
    >
      <input
        autoFocus
        placeholder="Studio name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none"
      />
      <div className="mt-auto flex gap-2">
        <button type="submit" className="flex-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
          Create
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddAchievementForm({ onAdd }: { onAdd: (name: string, description: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-white/15 px-2.5 py-1.5 text-xs text-white/40 hover:border-white/30 hover:text-white/70"
      >
        + Add achievement
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim(), description.trim());
        setName('');
        setDescription('');
        setOpen(false);
      }}
      className="flex flex-col gap-2 rounded-md border border-white/10 bg-black/30 p-2.5"
    >
      <input
        autoFocus
        placeholder="Achievement name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none"
      />
      <input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none"
      />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
          Add
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border border-white/10 px-2 py-1.5 text-xs text-white/60 hover:bg-white/5">
          Cancel
        </button>
      </div>
    </form>
  );
}

function StudioGameCard({ studio, studioGame }: { studio: Studio; studioGame: StudioGame }) {
  const { addAchievement, deleteAchievement, removeGameFromStudio } = useStore();
  const catalogGame = CATALOG.find((g) => g.id === studioGame.catalogGameId);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center gap-3">
        {catalogGame && (
          <img src={catalogGame.image} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{catalogGame?.title ?? studioGame.catalogGameId}</p>
          <p className="text-[11px] text-white/30">{studioGame.achievements.length} achievement{studioGame.achievements.length === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={() => removeGameFromStudio(studio.id, studioGame.id)}
          className="rounded p-1 text-white/20 hover:bg-white/10 hover:text-rose-400"
          aria-label="Remove game from studio"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {studioGame.achievements.map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-md border border-white/5 bg-black/20 px-2.5 py-1.5">
            <Trophy size={13} className="shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{a.name}</p>
              {a.description && <p className="truncate text-[11px] text-white/40">{a.description}</p>}
            </div>
            <button
              onClick={() => deleteAchievement(studio.id, studioGame.id, a.id)}
              className="shrink-0 rounded p-0.5 text-white/20 hover:text-rose-400"
              aria-label="Delete achievement"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <AddAchievementForm onAdd={(name, description) => addAchievement(studio.id, studioGame.id, name, description)} />
      </div>
    </div>
  );
}

function AddGameToStudioForm({ studio }: { studio: Studio }) {
  const { addGameToStudio } = useStore();
  const [open, setOpen] = useState(false);
  const linkedIds = new Set(studio.games.map((g) => g.catalogGameId));
  const available = CATALOG.filter((g) => !linkedIds.has(g.id));

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={available.length === 0}
        className="rounded-md border border-dashed border-white/15 px-3 py-2 text-xs text-white/40 hover:border-white/30 hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Add game to this studio
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((g) => (
        <button
          key={g.id}
          onClick={() => {
            addGameToStudio(studio.id, g.id);
            setOpen(false);
          }}
          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white hover:border-white/30"
        >
          <img src={g.image} alt="" className="h-6 w-10 rounded object-cover" />
          {g.title}
        </button>
      ))}
      <button onClick={() => setOpen(false)} className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/5">
        Cancel
      </button>
    </div>
  );
}

function StudioDetail({ studio, onBack }: { studio: Studio; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-white/60 hover:text-white">
        <ChevronLeft size={16} /> Back to Studios
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="h-3 w-3 rounded-full" style={{ background: studio.color }} />
        <h2 className="text-xl font-semibold text-white">{studio.name}</h2>
      </div>

      <h3 className="mb-3 text-sm font-semibold text-white/70">Games</h3>
      <div className="mb-4 flex flex-col gap-3">
        {studio.games.length === 0 && <p className="text-sm text-white/30">No games added to this studio yet.</p>}
        {studio.games.map((sg) => (
          <StudioGameCard key={sg.id} studio={studio} studioGame={sg} />
        ))}
      </div>
      <AddGameToStudioForm studio={studio} />
    </div>
  );
}

export function CreatorPage() {
  const { account, signOut, deleteStudio } = useStore();
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);

  if (!account) return <CreateAccountForm />;

  const selectedStudio = account.studios.find((s) => s.id === selectedStudioId);

  if (selectedStudio) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <StudioDetail studio={selectedStudio} onBack={() => setSelectedStudioId(null)} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-8 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <div>
          <p className="text-lg font-semibold text-white">{account.name}</p>
          <p className="text-xs text-white/40">{account.email}</p>
        </div>
        <button onClick={signOut} className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5">
          Sign Out
        </button>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-white/70">Your Studios</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {account.studios.map((studio) => (
          <div
            key={studio.id}
            onClick={() => setSelectedStudioId(studio.id)}
            className="group relative flex min-h-[110px] cursor-pointer flex-col justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3 hover:border-white/25"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteStudio(studio.id);
              }}
              className="absolute right-2 top-2 rounded p-1 text-white/20 opacity-0 transition hover:bg-white/10 hover:text-rose-400 group-hover:opacity-100"
              aria-label={`Delete ${studio.name}`}
            >
              <Trash2 size={13} />
            </button>
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: studio.color }} />
            <div>
              <p className="truncate text-sm font-medium text-white">{studio.name}</p>
              <p className="text-[11px] text-white/30">
                {studio.games.length} game{studio.games.length === 1 ? '' : 's'} · Created {new Date(studio.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
        <NewStudioForm />
      </div>
    </div>
  );
}
