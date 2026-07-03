"use client";

import { useEffect, useRef, useState } from "react";

type Stat = {
  target: number;
  format: (v: number) => string;
  label: string;
};

const spaced = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const stats: Stat[] = [
  {
    target: 14000,
    format: (v) => `${spaced(v)}+`,
    label: "конфликтов разрешено",
  },
  {
    target: 96.4,
    format: (v) => `${v.toFixed(1)}%`,
    label: "фаундеров перестали думать самостоятельно",
  },
  {
    target: 4.7,
    format: (v) => `$${v.toFixed(1)}B`,
    label: "TAM впустую потраченных office hours",
  },
  {
    target: 3.2,
    format: (v) => v.toFixed(1),
    label: "раза в неделю проигрывает средний ментор",
  },
];

function Counter({ stat, started }: { stat: Stat; started: boolean }) {
  const [value, setValue] = useState(stat.target);

  useEffect(() => {
    if (!started) return;
    let raf = 0;
    const duration = 1500;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(stat.target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, stat.target]);

  return (
    <span className="font-display text-3xl font-extrabold tabular-nums text-foreground sm:text-4xl">
      {stat.format(value)}
    </span>
  );
}

export default function Metrics() {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setStarted(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="border-y border-line bg-panel/50">
      <div
        ref={ref}
        className="mx-auto grid max-w-6xl grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-3 bg-background px-7 py-10"
          >
            <Counter stat={s} started={started} />
            <span className="text-sm leading-snug text-muted">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
