'use client';

import dynamic from 'next/dynamic';

// three.js — только на клиенте
const FightScreen = dynamic(() => import('@/components/game/FightScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0910] text-white/50">
      Загружаем арену переговоров…
    </div>
  ),
});

export default function FightPage() {
  return <FightScreen />;
}
