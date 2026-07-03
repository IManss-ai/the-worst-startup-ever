"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type Plan = "free" | "starter" | "pro" | "enterprise";

/* ------------------------------------------------------------------ */
/* Fake Kaspi QR: deterministic pseudo-random module grid (inline SVG) */
/* ------------------------------------------------------------------ */

const QR_SIZE = 25;

function buildQrCells(): boolean[][] {
  let s = 20260703;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const cells: boolean[][] = [];
  for (let y = 0; y < QR_SIZE; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < QR_SIZE; x++) row.push(rnd() > 0.52);
    cells.push(row);
  }
  return cells;
}

const QR_CELLS = buildQrCells();

function inFinder(x: number, y: number): boolean {
  const zones: Array<[number, number]> = [
    [0, 0],
    [QR_SIZE - 7, 0],
    [0, QR_SIZE - 7],
  ];
  return zones.some(([zx, zy]) => x >= zx && x < zx + 7 && y >= zy && y < zy + 7);
}

function finderDark(x: number, y: number): boolean {
  const zones: Array<[number, number]> = [
    [0, 0],
    [QR_SIZE - 7, 0],
    [0, QR_SIZE - 7],
  ];
  for (const [zx, zy] of zones) {
    if (x >= zx && x < zx + 7 && y >= zy && y < zy + 7) {
      const lx = x - zx;
      const ly = y - zy;
      const ring = lx === 0 || lx === 6 || ly === 0 || ly === 6;
      const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
      return ring || core;
    }
  }
  return false;
}

function KaspiQr() {
  const rects: React.ReactElement[] = [];
  for (let y = 0; y < QR_SIZE; y++) {
    for (let x = 0; x < QR_SIZE; x++) {
      const dark = inFinder(x, y) ? finderDark(x, y) : QR_CELLS[y][x];
      if (dark) {
        rects.push(
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />,
        );
      }
    }
  }
  return (
    <svg
      viewBox={`-1 -1 ${QR_SIZE + 2} ${QR_SIZE + 2}`}
      className="h-44 w-44 bg-white p-1 sm:h-52 sm:w-52"
      role="img"
      aria-label="QR-код Kaspi"
    >
      <g fill="#0e0d12">{rects}</g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Card helpers: masking + Luhn theater                                */
/* ------------------------------------------------------------------ */

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function luhnOk(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length !== 16) return false;
  let sum = 0;
  for (let i = 0; i < 16; i++) {
    let d = Number(digits[15 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/* ------------------------------------------------------------------ */
/* Plan data                                                           */
/* ------------------------------------------------------------------ */

const summaries: Record<Exclude<Plan, "free">, {
  title: string;
  price: string;
  amount: string | null;
  items: Array<{ label: string; value: string }>;
  total: string;
}> = {
  starter: {
    title: "NFAC KOMBAT Starter",
    price: "$19/мес",
    amount: "$19",
    items: [
      { label: "10 боёв в месяц", value: "$19/мес" },
      { label: "Насилие", value: "до 10 инцидентов/мес" },
      { label: "HD-рендеринг", value: "включено" },
      { label: "Письменный протокол боя", value: "включено" },
      { label: "НДС 12%", value: "уже в цене" },
    ],
    total: "$19/мес",
  },
  pro: {
    title: "NFAC KOMBAT Pro",
    price: "$49/мес",
    amount: "$49",
    items: [
      { label: "Безлимитные бои", value: "$49/мес" },
      { label: "Комиссия за насилие", value: "включено" },
      { label: "История поражений ментора", value: "включено" },
      { label: "30% carry", value: "после первого победившего совета" },
      { label: "НДС 12%", value: "уже в цене" },
    ],
    total: "$49/мес",
  },
  enterprise: {
    title: "Enterprise · Board Edition",
    price: "по запросу",
    amount: null,
    items: [
      { label: "Конфликты совета директоров", value: "безлимит" },
      { label: "Споры с LP", value: "безлимит" },
      { label: "SLA на фаталити", value: "99.99%" },
      { label: "Violence Success Manager", value: "персональный" },
    ],
    total: "обсудим на звонке",
  },
};

/* ------------------------------------------------------------------ */
/* UI pieces                                                           */
/* ------------------------------------------------------------------ */

function CheckoutHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="nFactorial"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg"
          />
          <span className="font-display text-sm font-bold tracking-[0.1em]">
            NFAC KOMBAT
          </span>
        </Link>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted sm:block">
          Защищено: SSL, NDA и страхом
        </span>
      </div>
    </header>
  );
}

function OrderSummary({ plan }: { plan: Exclude<Plan, "free"> }) {
  const s = summaries[plan];
  return (
    <div className="border border-line bg-panel/60 p-6 sm:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
        Ваш заказ
      </p>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-lg font-bold uppercase sm:text-xl">
          {s.title}
        </h1>
        <span className="shrink-0 font-display text-lg font-extrabold text-blood">
          {s.price}
        </span>
      </div>
      <ul className="mt-6 flex flex-col divide-y divide-line border-y border-line">
        {s.items.map((it) => (
          <li
            key={it.label}
            className="flex items-baseline justify-between gap-4 py-3 text-sm"
          >
            <span className="text-foreground/85">{it.label}</span>
            <span className="text-right font-mono text-xs text-muted">
              {it.value}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-display text-xs font-bold uppercase tracking-widest">
          Итого
        </span>
        <span className="font-display text-xl font-extrabold">{s.total}</span>
      </div>
      <p className="mt-6 font-mono text-[10px] leading-relaxed text-muted">
        Оплачивая, вы соглашаетесь с исходом любого боя. Возвраты не
        предусмотрены: победивший совет обратной силы не имеет.
      </p>
    </div>
  );
}

function ProcessingScreen() {
  return (
    <div className="flex flex-col items-center justify-center border border-line bg-panel/60 px-6 py-20 text-center">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-blood" />
      <p className="mt-6 font-display text-sm font-bold uppercase tracking-widest">
        Проверяем вашу платёжеспособность…
      </p>
      <p className="mt-2 font-mono text-xs text-muted">
        Это занимает меньше времени, чем один совет ментора
      </p>
    </div>
  );
}

function SuccessScreen({ planTitle }: { planTitle: string }) {
  return (
    <div className="mx-auto max-w-xl border border-line bg-panel/60 px-6 py-16 text-center sm:px-12">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-400 text-3xl text-green-400">
        ✓
      </span>
      <h1 className="mt-8 font-display text-xl font-extrabold uppercase leading-snug sm:text-2xl">
        Оплата прошла. {planTitle} активирован.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        С вас также автоматически удержан 30% carry с будущих побед.
      </p>
      <Link
        href="/fight"
        className="mt-10 inline-block bg-blood px-10 py-4 font-display text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-ember hover:shadow-[0_0_40px_rgba(255,46,61,0.5)] [clip-path:polygon(0_0,100%_0,100%_70%,92%_100%,0_100%)]"
      >
        К боям →
      </Link>
    </div>
  );
}

function FreeScreen() {
  return (
    <div className="mx-auto max-w-xl border border-line bg-panel/60 px-6 py-16 text-center sm:px-12">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-400 text-3xl text-green-400">
        ✓
      </span>
      <h1 className="mt-8 font-display text-xl font-extrabold uppercase leading-snug sm:text-2xl">
        Бесплатный план активирован
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Один бой в неделю уже доступен. Расходуйте его на самый дорогой
        конфликт.
      </p>
      <Link
        href="/fight"
        className="mt-10 inline-block bg-blood px-10 py-4 font-display text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-ember hover:shadow-[0_0_40px_rgba(255,46,61,0.5)] [clip-path:polygon(0_0,100%_0,100%_70%,92%_100%,0_100%)]"
      >
        К боям →
      </Link>
    </div>
  );
}

function EnterprisePanel() {
  const [booked, setBooked] = useState(false);
  return (
    <div className="border border-line bg-panel/60 p-6 sm:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
        Enterprise
      </p>
      <h2 className="mt-4 font-display text-lg font-bold uppercase leading-snug">
        Отдел продаж свяжется с вашим бордом в течение 3 фаталити
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Обычно хватает одного. Подготовьте список разногласий и хотя бы двух
        членов борда, готовых стоять за свои слова.
      </p>
      <button
        type="button"
        onClick={() => setBooked(true)}
        disabled={booked}
        className={`mt-8 w-full px-6 py-4 font-display text-xs font-bold uppercase tracking-widest transition-all ${
          booked
            ? "cursor-default border border-green-400/40 text-green-400"
            : "bg-blood text-white hover:bg-ember hover:shadow-[0_0_30px_rgba(255,46,61,0.45)]"
        }`}
      >
        {booked
          ? "Слот забронирован. Ожидайте фаталити."
          : "Выбрать время в календаре борда"}
      </button>
      <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        SLA на ответ: 99.99%
      </p>
    </div>
  );
}

function PaymentForm({
  amount,
  onSubmit,
}: {
  amount: string;
  onSubmit: () => void;
}) {
  const [tab, setTab] = useState<"card" | "kaspi">("card");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const digits = number.replace(/\D/g, "");
  const cardFilled = digits.length === 16 && expiry.length === 5 && cvc.length === 3;
  const looksSolvent = luhnOk(number);

  return (
    <div className="border border-line bg-panel/60 p-6 sm:p-8">
      <div className="grid grid-cols-2 border border-line">
        {(
          [
            ["card", "Карта"],
            ["kaspi", "Kaspi QR"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`py-3 font-display text-xs font-bold uppercase tracking-widest transition-colors ${
              tab === key
                ? "bg-blood text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "card" ? (
        <form
          className="mt-6 flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (cardFilled) onSubmit();
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              Номер карты
            </span>
            <input
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4400 4300 0000 0000"
              value={number}
              onChange={(e) => setNumber(formatCardNumber(e.target.value))}
              className="border border-line bg-background px-4 py-3 font-mono text-sm tracking-wider outline-none transition-colors placeholder:text-muted/40 focus:border-blood"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                Срок
              </span>
              <input
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="12/29"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                className="border border-line bg-background px-4 py-3 font-mono text-sm tracking-wider outline-none transition-colors placeholder:text-muted/40 focus:border-blood"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                CVC
              </span>
              <input
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="666"
                value={cvc}
                onChange={(e) =>
                  setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))
                }
                className="border border-line bg-background px-4 py-3 font-mono text-sm tracking-wider outline-none transition-colors placeholder:text-muted/40 focus:border-blood"
              />
            </label>
          </div>

          {digits.length === 16 && (
            <p
              className={`font-mono text-[11px] ${looksSolvent ? "text-green-400" : "text-muted"}`}
            >
              {looksSolvent
                ? "✓ Карта выглядит платёжеспособной"
                : "Карта выглядит сомнительно. Принимаем."}
            </p>
          )}

          <button
            type="submit"
            disabled={!cardFilled}
            className="mt-2 w-full bg-blood px-6 py-4 font-display text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-ember hover:shadow-[0_0_30px_rgba(255,46,61,0.45)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Оплатить {amount}
          </button>
          <p className="text-center font-mono text-[10px] text-muted">
            Мы не храним данные карты. Мы вообще ничего не храним.
          </p>
        </form>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-5">
          <KaspiQr />
          <p className="text-center text-sm text-muted">
            Отсканируйте, чтобы легализовать насилие
          </p>
          <button
            type="button"
            onClick={onSubmit}
            className="w-full bg-blood px-6 py-4 font-display text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-ember hover:shadow-[0_0_30px_rgba(255,46,61,0.45)]"
          >
            Я оплатил в Kaspi
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export default function Checkout({ plan }: { plan: Plan }) {
  const [stage, setStage] = useState<"form" | "processing" | "success">(
    "form",
  );

  const startProcessing = () => {
    setStage("processing");
    window.setTimeout(() => setStage("success"), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CheckoutHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        {plan === "free" ? (
          <FreeScreen />
        ) : stage === "success" ? (
          <SuccessScreen planTitle={summaries[plan].title} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <OrderSummary plan={plan} />
            {plan === "enterprise" ? (
              <EnterprisePanel />
            ) : stage === "processing" ? (
              <ProcessingScreen />
            ) : (
              <PaymentForm
                amount={summaries[plan].amount ?? "$49"}
                onSubmit={startProcessing}
              />
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-5xl px-5 py-6 font-mono text-[10px] text-muted sm:px-8">
          © 2026 NFAC KOMBAT · Платёж обрабатывается тем же движком, что и
          фаталити
        </p>
      </footer>
    </div>
  );
}
