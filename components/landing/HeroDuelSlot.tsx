"use client";

import dynamic from "next/dynamic";
import VSPanel from "@/components/landing/VSPanel";

const HeroDuel = dynamic(() => import("@/components/game/HeroDuel"), {
  ssr: false,
  loading: () => <VSPanel />,
});

export default function HeroDuelSlot() {
  return (
    <div>
      <div className="relative h-[340px] sm:h-[420px]">
        <HeroDuel className="h-full w-full" />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 border-t border-line pt-4 sm:gap-6">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-wider text-sky-400 sm:text-sm">
            Арман
          </p>
          <p className="mt-1 hidden font-mono text-[10px] text-muted sm:block">
            «Вам нужно пивотнуться. Вчера.»
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
          Live
        </span>
        <div className="text-right">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-blood sm:text-sm">
            Даурен
          </p>
          <p className="mt-1 hidden font-mono text-[10px] text-muted sm:block">
            «А как вы масштабируетесь?»
          </p>
        </div>
      </div>
    </div>
  );
}
