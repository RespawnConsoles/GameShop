
interface GameLogProps {
  log: string[];
}

export default function GameLog({ log }: GameLogProps) {
  return (
    <div className="bg-zinc-900 border-t border-zinc-700 px-4 py-2 h-20 overflow-y-auto font-mono">
      {log.map((entry, i) => (
        <p key={i} className={`text-xs leading-relaxed ${i === 0 ? "text-zinc-100" : "text-zinc-600"}`}>
          {entry}
        </p>
      ))}
    </div>
  );
}
