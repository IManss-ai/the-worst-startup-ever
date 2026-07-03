export default function Pain() {
  return (
    <section className="border-y border-line bg-panel/50">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-blood">
          Проблема
        </p>
        <h2 className="mt-6 max-w-3xl font-display text-2xl font-bold uppercase leading-snug sm:text-4xl">
          Каждый день 40 000 фаундеров получают взаимоисключающие советы.
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
          <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            «Пивот» в понедельник. «Фокус» во вторник. «Поднимайте раунд» и «не
            размывайтесь» — в один и тот же office hour. Это боль. Мы её
            оцифровали, отрендерили и добавили hit-боксы.
          </p>
          <p className="font-display text-5xl font-extrabold text-blood/90 sm:text-7xl">
            40&nbsp;000
          </p>
        </div>
      </div>
    </section>
  );
}
