// ЕДИНСТВЕННОЕ место, где настраивается ростер менторов.
// Модель кладём в public/models/<id>.glb — подхватится автоматически,
// если файла нет, боец рендерится процедурным плейсхолдером.

export interface Mentor {
  id: string;
  name: string;
  title: string; // venture-пародийный титул
  special: string; // название спешл-атаки
  color: string; // акцент бойца (плейсхолдер + UI)
  quote: string; // фраза на экране выбора
}

export const MENTORS: Mentor[] = [
  {
    id: 'mentor1',
    name: 'МЕНТОР 1',
    title: 'Serial Advisor · 0 экзитов',
    special: 'Пивот-кик',
    color: '#ff3b30',
    quote: 'Вам нужно пивотнуться. Вчера.',
  },
  {
    id: 'mentor2',
    name: 'МЕНТОР 2',
    title: 'Growth-шаман',
    special: 'Виральная петля',
    color: '#ff9500',
    quote: 'Фокус. Фокус. ФОКУС.',
  },
  {
    id: 'mentor3',
    name: 'МЕНТОР 3',
    title: 'Ex-FAANG (2 недели стажировки)',
    special: 'Систем-дизайн слэм',
    color: '#34c759',
    quote: 'А как вы масштабируетесь?',
  },
  {
    id: 'mentor4',
    name: 'МЕНТОР 4',
    title: 'Angel с чужими деньгами',
    special: 'Term Sheet Slam',
    color: '#0a84ff',
    quote: 'Я бы вложился. Но не буду.',
  },
  {
    id: 'mentor5',
    name: 'МЕНТОР 5',
    title: 'Продуктовый визионер',
    special: 'Roadmap Rage',
    color: '#bf5af2',
    quote: 'Это не фича. Это философия.',
  },
  {
    id: 'mentor6',
    name: 'МЕНТОР 6',
    title: 'AI-евангелист',
    special: 'Промпт-инжект',
    color: '#ffd60a',
    quote: 'А вы уже добавили AI?',
  },
];

export function mentorById(id: string): Mentor {
  return MENTORS.find((m) => m.id === id) ?? MENTORS[0];
}
