// Сервисы общины («мезуза в дом», «шабатний набор» и т.п.) — услуги, которые
// община оказывает участникам. Живёт в коде (демо). Универсальный набор
// Хабад-общины показывается у любой общины; со своей БД станет данными
// конкретной общины (и сервисы начнёт подсказывать проактивный ИИ).

export type ServiceIcon =
  | 'mezuzah' | 'tefillin' | 'candles' | 'shabbat' | 'kosher' | 'kaddish' | 'books';

export interface CommunityService {
  slug: string;
  icon: ServiceIcon;
  title: string;
  teaser: string;
  free?: boolean;
}

/** Базовый набор сервисов Хабад-общины. */
const COMMON_SERVICES: CommunityService[] = [
  {
    slug: 'mezuza-v-dom',
    icon: 'mezuzah',
    title: 'Первая мезуза в дом',
    teaser: 'Если у вас нет мезузы — приедем и установим первую мезузу совершенно бесплатно.',
    free: true,
  },
  {
    slug: 'tfilin',
    icon: 'tefillin',
    title: 'Тфилин',
    teaser: 'Поможем подобрать собственный тфилин — качественный, кошерный — и научим накладывать.',
  },
  {
    slug: 'subbotnie-svechi',
    icon: 'candles',
    title: 'Субботние свечи',
    teaser: 'Набор субботних свечей с благословением — свет радости и святости в каждый дом.',
    free: true,
  },
  {
    slug: 'shabatnij-nabor',
    icon: 'shabbat',
    title: 'Шабатний набор',
    teaser: 'Всё для встречи Шаббата дома: свечи, вино для кидуша, две халы.',
  },
  {
    slug: 'koshernyj-dom',
    icon: 'kosher',
    title: 'Кошерный дом',
    teaser: 'Консультация по кашруту: поможем откошеровать кухню и разобраться с продуктами.',
    free: true,
  },
  {
    slug: 'kadish',
    icon: 'kaddish',
    title: 'Кадиш по близким',
    teaser: 'Прочитаем Кадиш в миньяне в память о ваших близких — в йорцайт и памятные даты.',
    free: true,
  },
];

/** Сервисы по slug/идентификатору общины. Пока демо — дефолтный набор
 *  показывается у любой общины; со своей БД станет данными конкретной общины. */
const BY_COMMUNITY: Record<string, CommunityService[]> = {};

export function getServicesForCommunity(slug: string): CommunityService[] {
  return BY_COMMUNITY[slug] ?? COMMON_SERVICES;
}
