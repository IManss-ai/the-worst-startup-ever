import Link from "next/link";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "/мес",
    tagline: "Для фаундеров, которые ещё держатся",
    features: [
      "1 бой в неделю",
      "Рендеринг 720p — менторы слегка похожи на себя",
      "Совет победителя — только устно",
      "Базовые фаталити",
    ],
    cta: "Начать бесплатно",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/мес",
    tagline: "Выбор фаундеров без собственного мнения",
    features: [
      "Безлимитные бои",
      "История поражений вашего ментора",
      "Приоритетный рендеринг",
      "Экспорт фаталити в LinkedIn",
      "Нотариально заверенный* протокол боя",
    ],
    cta: "Выбрать Pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Board Edition",
    period: "",
    tagline: "Когда конфликтует не ментор, а борд",
    features: [
      "Конфликты совета директоров",
      "Споры с LP",
      "SLA на фаталити 99.99%",
      "Персональный Violence Success Manager",
      "Королевская битва до 8 адвайзеров",
    ],
    cta: "Связаться с продажами",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-blood">
          Тарифы
        </p>
        <h2 className="mt-6 font-display text-2xl font-bold uppercase leading-snug sm:text-4xl">
          Цена одного решения — дешевле одного созвона
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col border p-8 ${
                t.highlight
                  ? "border-blood bg-panel shadow-[0_0_60px_rgba(255,46,61,0.15)]"
                  : "border-line bg-panel/50"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-8 bg-blood px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  Популярный
                </span>
              )}
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-muted">
                {t.name}
              </h3>
              <p className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
                {t.price}
                {t.period && (
                  <span className="text-base font-medium text-muted">
                    {t.period}
                  </span>
                )}
              </p>
              <p className="mt-2 text-sm text-muted">{t.tagline}</p>

              <ul className="mt-8 flex flex-col gap-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 ${t.highlight ? "bg-blood" : "bg-foreground/30"}`}
                    />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/fight"
                className={`mt-10 block px-6 py-3.5 text-center font-display text-xs font-bold uppercase tracking-widest transition-all ${
                  t.highlight
                    ? "bg-blood text-white hover:bg-ember hover:shadow-[0_0_30px_rgba(255,46,61,0.45)]"
                    : "border border-line text-foreground hover:border-blood hover:text-blood"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-4 font-mono text-xs text-muted">
          *нотариус — тоже 3D-модель
        </p>
      </div>
    </section>
  );
}
