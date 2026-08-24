import { RESOURCE_ICONS } from "../gameState";
import type { Resources } from "../gameState";

const RESOURCES = ["wood", "brick", "sheep", "ore", "wheat"] as const;

const RESOURCE_BG: Record<string, string> = {
  wood:  "bg-green-800 border-green-600",
  brick: "bg-orange-800 border-orange-600",
  sheep: "bg-lime-700 border-lime-500",
  ore:   "bg-slate-600 border-slate-400",
  wheat: "bg-yellow-700 border-yellow-500",
};

interface ResourceCardsProps {
  resources: Resources;
  label: string;
  color: string;
}

export default function ResourceCards({ resources, label, color }: ResourceCardsProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className={`text-xs font-bold uppercase tracking-widest ${color}`}>{label}</p>
      <div className="flex gap-1.5">
        {RESOURCES.map(r => (
          <div
            key={r}
            className={`flex flex-col items-center justify-center rounded border ${RESOURCE_BG[r]} px-2 py-1 min-w-[2.5rem]`}
          >
            <span style={{ fontSize: "clamp(10px, 1.5vw, 18px)" }}>{RESOURCE_ICONS[r]}</span>
            <span className="text-white font-bold text-xs leading-none mt-0.5">
              {resources[r] || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
