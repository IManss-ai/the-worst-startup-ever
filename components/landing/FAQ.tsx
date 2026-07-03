"use client";

import { useState } from "react";

const items = [
  {
    q: "Это законно?",
    a: "Совет победителя юридически обязателен ровно в той же мере, в какой обязательны прогнозы в вашем pitch deck. Наши юристы (тоже 3D-модели) не нашли нарушений.",
  },
  {
    q: "Что если ментор откажется драться?",
    a: "Отказ засчитывается как поражение техническим нокаутом. Совет второго ментора вступает в силу немедленно, а факт отказа фиксируется в его публичной истории поражений.",
  },
  {
    q: "Как вы монетизируетесь?",
    a: "Мы берём 30% carry с каждого победившего совета. Если совет не сработал — carry всё равно берём. Это называется alignment.",
  },
  {
    q: "Менторы пострадали?",
    a: "Только их эго. 3D-модели полностью восстанавливаются после каждого боя. Эго — нет: среднее время восстановления составляет 3 office hours.",
  },
  {
    q: "Что делать, если оба совета плохие?",
    a: "Статистически проблема в вашем стартапе, а не в советах. HELL KOMBAT не решает эту проблему, но красиво её визуализирует в 60 FPS.",
  },
  {
    q: "Можно ли устроить бой между тремя и более менторами?",
    a: "Королевская битва адвайзеров доступна в тарифе Enterprise Board Edition. Advisory board из 8 человек рендерится за 4 минуты, выживает один совет.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-blood">
          FAQ
        </p>
        <h2 className="mt-6 font-display text-2xl font-bold uppercase leading-snug sm:text-4xl">
          Частые вопросы
        </h2>

        <div className="mt-10 border-t border-line">
          {items.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.q} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-blood"
                >
                  <span className="font-display text-sm font-bold sm:text-base">
                    {item.q}
                  </span>
                  <span
                    className={`shrink-0 font-display text-xl leading-none text-blood transition-transform duration-300 ${open ? "rotate-45" : ""}`}
                  >
                    +
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-6 pr-8 text-sm leading-relaxed text-muted">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
