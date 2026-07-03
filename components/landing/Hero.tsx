import Link from "next/link";

const trusted = [
  "PivotLabs",
  "BurnRate Capital",
  "Unicorn.kz",
  "StealthCo",
  "Runway Zero",
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -8%, rgba(255,46,61,0.16), transparent 65%), radial-gradient(ellipse 40% 30% at 85% 20%, rgba(255,122,61,0.07), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
        <div className="rise mx-auto flex w-fit items-center gap-2 border border-line bg-panel px-4 py-1.5">
          <span className="h-1.5 w-1.5 bg-blood" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Series A · Combat Engine v3.1 · Алматы
          </span>
        </div>

        <h1
          className="rise mx-auto mt-8 max-w-4xl text-center font-display text-4xl font-extrabold uppercase leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl"
          style={{ animationDelay: "0.1s" }}
        >
          Два ментора.
          <br />
          Один совет.
          <br />
          <span className="text-blood">Ноль компромиссов.</span>
        </h1>

        <p
          className="rise mx-auto mt-8 max-w-2xl text-center text-base leading-relaxed text-muted sm:text-lg"
          style={{ animationDelay: "0.22s" }}
        >
          MESH — первая в мире платформа разрешения менторских конфликтов.
          Менторы дерутся в 3D. Совет победителя становится юридически
          обязательным.
        </p>

        <div
          className="rise mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          style={{ animationDelay: "0.34s" }}
        >
          <Link
            href="/fight"
            className="w-full bg-blood px-8 py-4 text-center font-display text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-ember hover:shadow-[0_0_40px_rgba(255,46,61,0.5)] sm:w-auto [clip-path:polygon(0_0,100%_0,100%_70%,92%_100%,0_100%)]"
          >
            Разрешить конфликт →
          </Link>
          <Link
            href="/fight"
            className="w-full border border-line px-8 py-4 text-center font-display text-sm font-bold uppercase tracking-widest text-foreground transition-colors hover:border-blood hover:text-blood sm:w-auto"
          >
            Смотреть демо
          </Link>
        </div>

        {/* VS panel */}
        <div
          className="rise mx-auto mt-16 max-w-3xl border border-line bg-panel/80 p-5 shadow-[0_0_80px_rgba(255,46,61,0.08)] sm:p-8"
          style={{ animationDelay: "0.46s" }}
        >
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted sm:text-xs">
            <span>Раунд 1 из 1</span>
            <span className="text-blood">Live-рендеринг</span>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <div>
              <p className="truncate font-display text-xs font-bold uppercase tracking-wider sm:text-sm">
                Ментор «Пивот»
              </p>
              <div className="mt-2 h-3 border border-line bg-background p-[2px]">
                <div className="hp-left h-full bg-gradient-to-r from-ember to-blood" />
              </div>
              <p className="mt-2 hidden font-mono text-[10px] text-muted sm:block">
                «Рынок сместился. Пивотнитесь.»
              </p>
            </div>

            <span className="vs-flicker font-display text-3xl font-extrabold text-blood sm:text-5xl">
              VS
            </span>

            <div className="text-right">
              <p className="truncate font-display text-xs font-bold uppercase tracking-wider sm:text-sm">
                Ментор «Фокус»
              </p>
              <div className="mt-2 h-3 border border-line bg-background p-[2px]">
                <div className="hp-right ml-auto h-full bg-gradient-to-l from-ember to-blood" />
              </div>
              <p className="mt-2 hidden font-mono text-[10px] text-muted sm:block">
                «Не распыляйтесь. Фокус.»
              </p>
            </div>
          </div>

          <p className="mt-6 border-t border-line pt-4 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted sm:text-xs">
            Победивший совет исполняется без обсуждений
          </p>
        </div>

        {/* Trust strip */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted">
            Нам доверяют фаундеры, у которых больше нет собственного мнения
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {trusted.map((name) => (
              <span
                key={name}
                className="font-display text-sm font-semibold uppercase tracking-wider text-foreground/25"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
