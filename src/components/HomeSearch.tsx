import { useEffect, useMemo, useRef, useState } from "react";
import { searchCities } from "../data/cities";
import { searchPlaces, type PlaceSuggestion } from "../lib/geo";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function HomeSearch({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<PlaceSuggestion[]>([]);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const local = useMemo(() => searchCities(value, 6), [value]);

  const options = useMemo(() => {
    const seen = new Set(local.map((c) => `${c.name}, ${c.state}`.toLowerCase()));
    const extras = remote.filter((r) => !seen.has(r.label.toLowerCase()));
    return [
      ...local.map((c) => `${c.name}, ${c.state}`),
      ...extras.map((r) => r.label),
    ].slice(0, 8);
  }, [local, remote]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setRemote([]);
      return;
    }
    const id = window.setTimeout(() => {
      void searchPlaces(q).then(setRemote);
    }, 220);
    return () => window.clearTimeout(id);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (label: string) => {
    onChange(label);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        required
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || options.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(options.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(options[active] ?? value);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Type a city — New York, Phoenix…"
        className="w-full rounded-xl border border-ink/10 bg-white/90 px-3.5 py-3 text-[15px] outline-none ring-pine/30 transition focus:ring-2"
      />
      {open && options.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-ink/10">
          {options.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                className={`block w-full px-3.5 py-2 text-left text-sm ${
                  i === active ? "bg-paper-deep text-pine" : "text-ink hover:bg-paper"
                }`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(label)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
