import { useState } from 'react';
import { Trash2, Wand2 } from 'lucide-react';
import { useStore } from '../lib/store';

function CreateAccountForm() {
  const { createAccount } = useStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <Wand2 size={32} className="text-white/20" />
      <h2 className="text-lg font-semibold text-white">Create your Creator account</h2>
      <p className="max-w-sm text-sm text-white/50">
        Set up an account to create studios and eventually publish your own games to the store.
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

export function CreatorPage() {
  const { account, signOut, deleteStudio } = useStore();

  if (!account) return <CreateAccountForm />;

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
          <div key={studio.id} className="group relative flex min-h-[110px] flex-col justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <button
              onClick={() => deleteStudio(studio.id)}
              className="absolute right-2 top-2 rounded p-1 text-white/20 opacity-0 transition hover:bg-white/10 hover:text-rose-400 group-hover:opacity-100"
              aria-label={`Delete ${studio.name}`}
            >
              <Trash2 size={13} />
            </button>
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: studio.color }} />
            <div>
              <p className="truncate text-sm font-medium text-white">{studio.name}</p>
              <p className="text-[11px] text-white/30">Created {new Date(studio.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
        <NewStudioForm />
      </div>
    </div>
  );
}
