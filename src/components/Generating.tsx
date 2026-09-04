const STEPS = [
  "Reading the landscape",
  "Choosing a sane daily pace",
  "Estimating flights, hotels, and the car",
  "Laying out the map",
];

export function Generating({ parkName }: { parkName: string }) {
  return (
    <div className="paper-grid flex min-h-screen flex-col items-center justify-center px-6">
      <p className="font-display text-sm tracking-[0.28em] text-gold">PARKPATH</p>
      <h1 className="mt-4 max-w-lg text-center font-display text-4xl uppercase leading-none tracking-wide text-pine sm:text-5xl">
        Drawing your {parkName} trip
      </h1>
      <ul className="mt-10 space-y-3">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="flex items-center gap-3 text-sm font-medium text-ink-soft"
            style={{ animation: `rise 1.2s ease ${i * 0.35}s both` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-pine" />
            {step}
          </li>
        ))}
      </ul>
      <style>{`
        @keyframes rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
