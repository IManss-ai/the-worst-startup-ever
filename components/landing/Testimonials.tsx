const testimonials = [
  {
    quote:
      "Раньше я неделями выбирал, чей совет слушать. Теперь это занимает 2 минуты 30 секунд, включая фаталити.",
    name: "Алишер",
    role: "фаундер B2B SaaS",
  },
  {
    quote:
      "Мой ментор из глобального акселератора проиграл локальному апперкотом на 47-й секунде. Пивот сделали в тот же вечер. Жалеть не о чем, решение принимал не я.",
    name: "Дана",
    role: "ко-фаундер маркетплейса",
  },
  {
    quote:
      "У нас был один blocker на пути к product-market fit — необходимость думать. NFAC KOMBAT его закрыл.",
    name: "Тимур",
    role: "фаундер AI-стартапа",
  },
];

export default function Testimonials() {
  return (
    <section className="border-y border-line bg-panel/50">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-blood">
          Отзывы
        </p>
        <h2 className="mt-6 font-display text-2xl font-bold uppercase leading-snug sm:text-4xl">
          Фаундеры, которые больше не сомневаются
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col justify-between border border-line bg-background p-8 transition-colors hover:border-blood/40"
            >
              <blockquote className="text-sm leading-relaxed text-foreground/85">
                <span className="mb-4 block font-display text-4xl leading-none text-blood">
                  &ldquo;
                </span>
                {t.quote}
              </blockquote>
              <figcaption className="mt-8 border-t border-line pt-4">
                <span className="font-display text-sm font-bold">{t.name}</span>
                <span className="block font-mono text-xs text-muted">
                  {t.role}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
