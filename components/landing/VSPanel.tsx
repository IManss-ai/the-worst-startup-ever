export default function VSPanel() {
  return (
    <div className="flex h-full flex-col justify-center border border-line bg-panel/80 p-5 shadow-[0_0_80px_rgba(255,46,61,0.08)] sm:p-8">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted sm:text-xs">
        <span>Раунд 1 из 1</span>
        <span className="text-blood">Live-рендеринг</span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <div>
          <p className="truncate font-display text-xs font-bold uppercase tracking-wider text-sky-400 sm:text-sm">
            Арман
          </p>
          <div className="mt-2 h-3 border border-line bg-background p-[2px]">
            <div className="hp-left h-full bg-gradient-to-r from-sky-500 to-blue-600" />
          </div>
          <p className="mt-2 hidden font-mono text-[10px] text-muted sm:block">
            «Вам нужно пивотнуться. Вчера.»
          </p>
        </div>

        <span className="vs-flicker font-display text-3xl font-extrabold text-blood sm:text-5xl">
          VS
        </span>

        <div className="text-right">
          <p className="truncate font-display text-xs font-bold uppercase tracking-wider text-blood sm:text-sm">
            Даурен
          </p>
          <div className="mt-2 h-3 border border-line bg-background p-[2px]">
            <div className="hp-right ml-auto h-full bg-gradient-to-l from-ember to-blood" />
          </div>
          <p className="mt-2 hidden font-mono text-[10px] text-muted sm:block">
            «А как вы масштабируетесь?»
          </p>
        </div>
      </div>

      <p className="mt-6 border-t border-line pt-4 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted sm:text-xs">
        Победивший совет исполняется без обсуждений
      </p>
    </div>
  );
}
