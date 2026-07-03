import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-y border-line">
      {/* Hell-arena artwork, kept very dark so text stays readable */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: "url(/bg.webp)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(rgba(8,7,10,0.88), rgba(8,7,10,0.82)), radial-gradient(ellipse 60% 80% at 50% 110%, rgba(255,46,61,0.18), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <h2 className="mx-auto max-w-3xl font-display text-3xl font-extrabold uppercase leading-tight sm:text-5xl">
          Хватит слушать <span className="text-blood">обоих</span>.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted sm:text-lg">
          Загрузите конфликт. Остальное решит физический движок.
        </p>
        <Link
          href="/fight"
          className="mt-10 inline-block bg-blood px-10 py-4 font-display text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-ember hover:shadow-[0_0_50px_rgba(255,46,61,0.55)] [clip-path:polygon(0_0,100%_0,100%_70%,92%_100%,0_100%)]"
        >
          Начать бой →
        </Link>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Кредитная карта не нужна. Ментор — нужен. Желательно два.
        </p>
      </div>
    </section>
  );
}
