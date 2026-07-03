import { NextRequest, NextResponse } from 'next/server';

// Живой AI для трештока; без ключа или при ошибке — офлайн-пул.
// Клиент дополнительно имеет собственный пул на случай сетевого сбоя.

const FALLBACK_POOL = [
  'Твой CAC превысил твой LTV. Позор.',
  'Это был не удар. Это был пивот.',
  'Ретеншн твоего лица — ноль процентов.',
  'Даже твой term sheet не подписан.',
  'Юнит-экономика не сходится. Как и твоя челюсть.',
  'Ты не масштабируешься. FINISH HIM.',
  'Твой runway закончился. Буквально.',
  'Это даже не product-market fit. Это просто fit.',
  'Советую пивот в горизонтальное положение.',
  'Твой burn rate теперь измеряется в нокаутах.',
  'Инвесторы вышли. Из зала.',
  'Ты — фича, а не компания.',
];

function fallbackLine(): string {
  return FALLBACK_POOL[Math.floor(Math.random() * FALLBACK_POOL.length)];
}

export async function POST(req: NextRequest) {
  let winner = 'Ментор';
  let loser = 'Другой ментор';
  let event = 'round_end';
  try {
    const body = await req.json();
    winner = body.winner ?? winner;
    loser = body.loser ?? loser;
    event = body.event ?? event;
  } catch {
    // тело не обязательно
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ line: fallbackLine(), source: 'pool' });
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey, timeout: 4000, maxRetries: 0 });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      messages: [
        {
          role: 'user',
          content: `Ты — комментатор пародийного файтинга, где менторы стартап-инкубатора дерутся, чтобы решить, чей совет правильный. Победитель раунда: "${winner}". Проигравший: "${loser}". Событие: ${event}. Выдай ОДНУ короткую (до 12 слов) реплику-трешток на русском в стиле Mortal Kombat, но с венчурным жаргоном (CAC, LTV, ретеншн, runway, пивот, term sheet). Без оскорблений реальных людей, без мата. Только реплика, без кавычек.`,
        },
      ],
    });
    const text = msg.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join(' ')
      .trim();
    return NextResponse.json({ line: text || fallbackLine(), source: text ? 'ai' : 'pool' });
  } catch {
    return NextResponse.json({ line: fallbackLine(), source: 'pool' });
  }
}
