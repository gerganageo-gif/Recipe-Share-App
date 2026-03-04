export const RECIPE_CATEGORIES = [
  'Всички',
  'Закуски',
  'Салати',
  'Супи',
  'Основни ястия',
  'Десерти',
  'Здравословни',
  'Вегетариански'
];

export function isValidRecipeCategory(category) {
  return RECIPE_CATEGORIES.includes(category);
}

export function normalizeRecipeCategory(category) {
  if (!category || !isValidRecipeCategory(category)) {
    return 'Всички';
  }

  return category;
}
