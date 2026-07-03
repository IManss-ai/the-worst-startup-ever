const steps = [
  {
    num: "01",
    title: "Конфликт зафиксирован",
    text: "Два ментора дают вам противоположные советы. Вы загружаете оба в MESH — дословно, со всеми «на самом деле» и «поверь моему опыту».",
  },
  {
    num: "02",
    title: "3D-рендеринг менторов",
    text: "Наш Combat Engine строит физически корректные модели менторов. Осанка, часы, тон голоса на демо-дне — всё учитывается в характеристиках бойца.",
  },
  {
    num: "03",
    title: "Бой",
    text: "Менторы дерутся в формате best-of-one. Никаких переигровок, никаких «давайте созвонимся ещё раз». Один раунд. Одна истина.",
  },
  {
    num: "04",
    title: "Совет победителя обязателен",
    text: "Победивший совет вступает в силу немедленно и обязателен к исполнению юридически*. Проигравший совет удаляется из вашей памяти и CRM.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-blood">
          Процесс
        </p>
        <h2 className="mt-6 font-display text-2xl font-bold uppercase leading-snug sm:text-4xl">
          Как это работает
        </h2>

        <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.num}
              className="group bg-background p-7 transition-colors hover:bg-panel"
            >
              <span className="font-display text-3xl font-extrabold text-foreground/15 transition-colors group-hover:text-blood">
                {s.num}
              </span>
              <h3 className="mt-5 font-display text-sm font-bold uppercase tracking-wide">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{s.text}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 font-mono text-xs text-muted">*не юридически</p>
      </div>
    </section>
  );
}
