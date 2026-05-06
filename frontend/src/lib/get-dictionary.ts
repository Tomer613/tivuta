import 'server-only';

const dictionaries = {
  he: () => import('../dictionaries/he.json').then((module) => module.default),
  en: () => import('../dictionaries/en.json').then((module) => module.default),
  fr: () => import('../dictionaries/fr.json').then((module) => module.default),
  yi: () => import('../dictionaries/yi.json').then((module) => module.default),
};

export const getDictionary = async (locale: string) => {
  return dictionaries[locale as keyof typeof dictionaries]?.() ?? dictionaries.he();
};
