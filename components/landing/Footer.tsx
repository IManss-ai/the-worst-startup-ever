import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-panel/60">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center bg-blood font-display text-[9px] font-extrabold text-white [clip-path:polygon(0_0,100%_0,100%_78%,78%_100%,0_100%)]">
                HK
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
                  nFactorial
                </span>
                <span className="mt-0.5 font-display text-sm font-bold tracking-[0.1em]">
                  HELL KOMBAT
                </span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Платформа разрешения менторских конфликтов. Мы не храним стыд
              вашего ментора. Privacy first.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 sm:gap-16">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
                Статус
              </p>
              <p className="mt-4 flex items-center gap-2.5 text-sm">
                <span className="pulse-dot h-2 w-2 rounded-full bg-green-400" />
                HELL KOMBAT Engine: uptime 99.99%
              </p>
              <p className="mt-2 font-mono text-xs text-muted">
                Последний инцидент: ментор застрял в текстурах
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
                Карьера
              </p>
              <Link
                href="/fight"
                className="mt-4 block text-sm text-foreground transition-colors hover:text-blood"
              >
                Senior Violence Engineer
                <span className="block font-mono text-xs text-muted">
                  Remote · эквити · защита от менторов
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-muted">
            © 2026 nFactorial HELL KOMBAT. Все менторы вымышлены. Конфликты — настоящие.
          </p>
          <p className="font-mono text-xs text-muted">
            Сделано между двумя противоположными советами
          </p>
        </div>
      </div>
    </footer>
  );
}
