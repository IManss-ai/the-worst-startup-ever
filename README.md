# MESH — Mentorship Conflict Resolution Platform

> Два ментора. Один совет. Ноль компромиссов.

Хакатон **Worst Startup Ever** (nFactorial). Менторы инкубатора дерутся в 3D в
стиле Mortal Kombat; совет победителя становится «юридически обязательным».

**Прод:** https://the-worst-startup-ever.vercel.app · Демо: `/fight`

## Управление

| Действие | Игрок 1 | Игрок 2 |
|---|---|---|
| Движение | A / D | ← / → |
| Удар | F | K |
| Пинок | G | L |
| Спешл (кулдаун 4с) | H | ; |

Режимы: **2 ИГРОКА** · **ПРОТИВ CPU** (вы — P1) · **АВТО-БОЙ** (CPU vs CPU — режим демо).
Кнопка **AUTO** внизу справа во время боя передаёт управление AI — паник-кнопка для сцены.
Бой: best of 3, раунд 60 секунд, HP 100.

## Как добавить настоящих менторов

1. Отредактируй ростер в `lib/mentors.ts` (имена, титулы, спешлы, цитаты).
2. Положи риггед-модель в `public/models/<id>.glb` (id из ростера, например `mentor1.glb`).
   Анимации подхватываются по именам клипов: idle / walk / punch / kick / hit / death.
   Нет модели или битый файл → боец автоматически рендерится плейсхолдером, ничего не падает.

## Архитектура

- `components/game/engine.ts` — детерминированный движок боя (чистый TS, без React).
  `KeyboardController` и `AIController` реализуют один интерфейс `Controller`.
- `components/game/FightScreen.tsx` — оркестрация раундов, HUD, клавиатура, таймер.
- `components/game/Fighter.tsx` — GLB с анимациями + процедурный fallback + error boundary.
- `components/game/audio.ts` — весь звук синтезируется WebAudio; голос — speechSynthesis.
- `app/api/trashtalk/route.ts` — живой трешток через Claude (haiku); без ключа/при сбое —
  офлайн-пул. Ключ: `vercel env add ANTHROPIC_API_KEY production`.
- `components/landing/*` — лендинг (Series-A пародия).
- `PITCH.md` — скрипт питча + заготовки Q&A + чек-лист перед сценой.

## Запуск

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # прод-сборка
vercel deploy --prod --yes
```
