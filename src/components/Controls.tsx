import { MAX_TIME_OPTIONS } from "@/lib/isochrone";
import { TRAVEL_MODES, type TravelMode } from "@/lib/routing/types";

interface ControlsProps {
  mode: TravelMode;
  maxTime: number;
  onModeChange: (mode: TravelMode) => void;
  onMaxTimeChange: (maxTime: number) => void;
}

const MODE_LABELS: Record<TravelMode, string> = {
  driving: "🚗 Drive",
  walking: "🚶 Walk",
  cycling: "🚴 Cycle",
};

export default function Controls({
  mode,
  maxTime,
  onModeChange,
  onMaxTimeChange,
}: ControlsProps) {
  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Travel mode
        </p>
        <div className="flex gap-1" role="group" aria-label="Travel mode">
          {TRAVEL_MODES.map((m) => {
            const active = m === mode;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => onModeChange(m)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="max-time"
          className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          Max commute time
        </label>
        <select
          id="max-time"
          value={maxTime}
          onChange={(e) => onMaxTimeChange(Number(e.target.value))}
          className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {MAX_TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t} min
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
