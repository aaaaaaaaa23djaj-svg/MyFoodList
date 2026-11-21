import type { AestheticBackgroundId } from '../types/recipe';

export interface AestheticBackgroundOption {
  id: AestheticBackgroundId;
  name: string;
  subtitle: string;
  imageUrl?: string;
  isDark: boolean;
  canvasBgClass: string;
  scrimClass: string;
}

export const AESTHETIC_BACKGROUNDS: AestheticBackgroundOption[] = [
  {
    id: 'sunlit-marble',
    name: 'Sunlit Marble',
    subtitle: 'Carrara stone with morning window shadows',
    imageUrl: '/src/assets/images/bg_sunlit_marble_1795273622926.jpg',
    isDark: false,
    canvasBgClass: 'bg-stone-100',
    scrimClass: 'bg-white/62',
  },
  {
    id: 'botanical-linen',
    name: 'Botanical Linen',
    subtitle: 'Oatmeal woven cloth & olive leaf light',
    imageUrl: '/src/assets/images/bg_botanical_linen_1795273622860.jpg',
    isDark: false,
    canvasBgClass: 'bg-stone-100',
    scrimClass: 'bg-stone-50/66',
  },
  {
    id: 'midnight-bistro',
    name: 'Midnight Bistro',
    subtitle: 'Charcoal slate & candlelit oak table',
    imageUrl: '/src/assets/images/bg_midnight_bistro_1795273622571.jpg',
    isDark: true,
    canvasBgClass: 'bg-stone-950',
    scrimClass: 'bg-stone-950/72',
  },
  {
    id: 'pure-paper',
    name: 'Pure Paper',
    subtitle: 'Clean warm alabaster studio backdrop',
    isDark: false,
    canvasBgClass: 'bg-[#F6F5F1]',
    scrimClass: 'bg-transparent',
  },
];

export function getBackgroundById(id: AestheticBackgroundId): AestheticBackgroundOption {
  return AESTHETIC_BACKGROUNDS.find((bg) => bg.id === id) ?? AESTHETIC_BACKGROUNDS[0];
}
