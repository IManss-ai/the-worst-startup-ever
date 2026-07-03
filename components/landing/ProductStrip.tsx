const chips = [
  "Combat Engine API",
  "Дашборд конфликтов",
  "SLA на фаталити",
  "SSO для менторов",
];

export default function ProductStrip() {
  return (
    <div className="border-t border-line bg-panel/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5 sm:px-8">
        {chips.map((chip) => (
          <span
            key={chip}
            className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted"
          >
            <span className="h-1 w-1 bg-blood" />
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}
