"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "#how", label: "Как это работает" },
  { href: "#pricing", label: "Тарифы" },
  { href: "#faq", label: "FAQ" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center bg-blood font-display text-[10px] font-extrabold text-white [clip-path:polygon(0_0,100%_0,100%_78%,78%_100%,0_100%)]">
            HK
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
              nFactorial
            </span>
            <span className="mt-0.5 font-display text-base font-bold tracking-[0.1em]">
              HELL KOMBAT
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/fight"
            className="bg-blood px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-ember hover:shadow-[0_0_24px_rgba(255,46,61,0.45)] [clip-path:polygon(0_0,100%_0,100%_70%,88%_100%,0_100%)]"
          >
            Начать бой
          </Link>
        </div>

        <button
          type="button"
          aria-label="Открыть меню"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span
            className={`h-0.5 w-6 bg-foreground transition-transform ${open ? "translate-y-1 rotate-45" : ""}`}
          />
          <span
            className={`h-0.5 w-6 bg-foreground transition-transform ${open ? "-translate-y-1 -rotate-45" : ""}`}
          />
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-background px-5 pb-6 pt-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 text-base text-muted transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/fight"
              className="mt-3 bg-blood px-5 py-3 text-center font-display text-sm font-bold uppercase tracking-widest text-white"
            >
              Начать бой
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
