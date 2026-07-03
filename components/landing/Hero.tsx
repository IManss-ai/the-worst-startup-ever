import Link from "next/link";
import HeroDuelSlot from "@/components/landing/HeroDuelSlot";

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
            nFactorial presents · Combat Engine v3.1 · Алматы
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
          NFAC KOMBAT — первая в мире платформа разрешения менторских
          конфликтов. Менторы дерутся в 3D. Совет победителя становится
          юридически обязательным.
        </p>

        <p
          className="rise mx-auto mt-4 max-w-2xl text-center font-mono text-[11px] uppercase tracking-[0.16em] text-foreground/55 sm:text-xs"
          style={{ animationDelay: "0.28s" }}
        >
          B2B SaaS для инкубаторов и акселераторов. Тарифы по подписке, carry —
          с побед.
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

        {/* Live 3D duel — CSS VS panel renders while the scene loads */}
        <div
          className="rise mx-auto mt-16 max-w-3xl"
          style={{ animationDelay: "0.46s" }}
        >
          <HeroDuelSlot />
        </div>

        {/* Online mode callout */}
        <div
          className="rise mx-auto mt-8 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 border border-line bg-panel/70 px-5 py-3"
          style={{ animationDelay: "0.58s" }}
        >
          <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blood">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-green-400" />
            Новое · Онлайн-режим
          </span>
          <span className="text-sm text-muted">
            каждый ментор дерётся со своего ноутбука — room code вместо
            переговорки
          </span>
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
