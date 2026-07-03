const outlets = ["TechCrunch", "Forbes", "The Information", "Bloomberg"];

export default function Press() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-muted">
          О нас (пока) не написали:
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
          {outlets.map((o) => (
            <span
              key={o}
              className="font-display text-lg font-bold tracking-tight text-foreground/20 grayscale sm:text-2xl"
            >
              {o}
            </span>
          ))}
        </div>
        <p className="mt-8 text-center font-mono text-[11px] text-muted/70">
          Запросы на интервью направляйте в никуда — мы их всё равно не читаем.
        </p>
      </div>
    </section>
  );
}
