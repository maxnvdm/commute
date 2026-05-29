import { legendItems } from "@/lib/isochrone";

interface LegendProps {
  ranges: number[];
}

export default function Legend({ ranges }: LegendProps) {
  const items = legendItems(ranges);
  return (
    <div className="rounded-lg bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:bg-zinc-900/95">
      <p className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">
        Commute time
      </p>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.minutes} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-4 rounded-sm"
              style={{ backgroundColor: it.color }}
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              ≤ {it.minutes} min
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 max-w-[10rem] text-[10px] leading-tight text-zinc-400">
        Typical free-flow times — no live traffic (coming in v2).
      </p>
    </div>
  );
}
