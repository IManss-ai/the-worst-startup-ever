// ЕДИНСТВЕННОЕ место, где настраивается ростер менторов.
// Модель: public/models/<id>.glb — статичные фотоскан-меши (без рига),
// анимация полностью процедурная. Нет файла → плейсхолдер, ничего не падает.

export interface Mentor {
  id: string;
  name: string;
  title: string; // venture-пародийный титул
  special: string; // название спешл-атаки
  color: string; // акцент бойца (UI + подсветка)
  quote: string; // фраза на экране выбора — она же «совет, вступающий в силу»
}

export const MENTORS: Mentor[] = [
  {
    id: 'arman',
    name: 'АРМАН',
    title: 'Chief Vision Officer',
    special: 'Пивот-кик',
    color: '#ff3b30',
    quote: 'Вам нужно пивотнуться. Вчера.',
  },
  {
    id: 'amina',
    name: 'АМИНА',
    title: 'Growth-шаман',
    special: 'Виральная петля',
    color: '#ff9500',
    quote: 'Фокус. Фокус. ФОКУС.',
  },
  {
    id: 'asel',
    name: 'АСЕЛЬ',
    title: 'Product Visionary',
    special: 'Roadmap Rage',
    color: '#bf5af2',
    quote: 'Это не фича. Это философия.',
  },
  {
    id: 'dauren',
    name: 'ДАУРЕН',
    title: 'Ex-FAANG (2 недели стажировки)',
    special: 'Систем-дизайн слэм',
    color: '#34c759',
    quote: 'А как вы масштабируетесь?',
  },
  {
    id: 'bakhaudin',
    name: 'БАХАУДИН',
    title: 'Angel с чужими деньгами',
    special: 'Term Sheet Slam',
    color: '#0a84ff',
    quote: 'Я бы вложился. Но не буду.',
  },
  {
    id: 'jafar',
    name: 'ДЖАФАР',
    title: 'AI-евангелист',
    special: 'Промпт-инжект',
    color: '#ffd60a',
    quote: 'А вы уже добавили AI?',
  },
  {
    id: 'diana',
    name: 'ДИАНА',
    title: 'Brand & Storytelling',
    special: 'Нарратив-шок',
    color: '#ff2d55',
    quote: 'Ваша история никого не трогает.',
  },
  {
    id: 'bazra',
    name: 'БАЗРА',
    title: 'Unit-экономика инквизитор',
    special: 'Кэшфлоу-разрыв',
    color: '#64d2ff',
    quote: 'Покажите мне цифры. Настоящие.',
  },
  {
    id: 'tins',
    name: 'ТИНС',
    title: 'Наставник поколения Z',
    special: 'Брейнрот-волна',
    color: '#30d158',
    quote: 'Просто снимите тикток про это.',
  },
];

export function mentorById(id: string): Mentor {
  return MENTORS.find((m) => m.id === id) ?? MENTORS[0];
}
