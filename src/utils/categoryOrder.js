import { slugifyCategory } from './categoryRoutes';

const preferredCategoryOrder = [
  'Shop Shelving',
  'Shelving Components',
  'Wall Shelves',
  'Gondola Shelves',
  'Magazine Shelves',
  'Greeting Card Shelves',
  'Shop Flooring',
  'Boards',
  'LED Shop Lightings',
  'Fruits & Veg Shelves',
  'Neon Signage Lights',
  'Tobacco and Vape',
  'Baskets & Trolleys',
  'Wire & Metal Retail Displays',
];

const categoryOrderAliases = {
  'shelving-components': 'shelving-components',
  'shelving-component': 'shelving-components',
  'shelving-components-and-accessories': 'shelving-components',
  'wall-shelves': 'wall-shelves',
  'wall-shelving': 'wall-shelves',
  'wall-bays': 'wall-shelves',
  'gondola-shelves': 'gondola-shelves',
  'gondola-shelving': 'gondola-shelves',
  'magazine-shelves': 'magazine-shelves',
  'magazine': 'magazine-shelves',
  'news-and-mags': 'magazine-shelves',
  'greeting-card-shelves': 'greeting-card-shelves',
  'greeting-cards': 'greeting-card-shelves',
  'cards-and-gift-wrap': 'greeting-card-shelves',
  'flooring': 'shop-flooring',
  'shopflooring': 'shop-flooring',
  'shop-flooring': 'shop-flooring',
  'boards': 'boards',
  'slatwall-panels': 'boards',
  'wall-panels': 'boards',
  'end-panels-and-boards': 'boards',
  'shop-led-lights': 'led-shop-lightings',
  'led-shop-lighting': 'led-shop-lightings',
  'led-shop-lightings': 'led-shop-lightings',
  'led-lights': 'led-shop-lightings',
  'neon-signage-lights': 'neon-signage-lights',
  'fruit-and-veg-shelving': 'fruits-and-veg-shelves',
  'fruits-and-veg-shelving': 'fruits-and-veg-shelves',
  'fruit-and-veg-shelves': 'fruits-and-veg-shelves',
  'fruits-and-veg-shelves': 'fruits-and-veg-shelves',
  'veg-table-shelves': 'fruits-and-veg-shelves',
  'tobacco-and-vape': 'tobacco-and-vape',
  'tobacco-and-vape-displays': 'tobacco-and-vape',
  'vape-counters': 'tobacco-and-vape',
  'baskets-and-trolleys': 'baskets-and-trolleys',
  'baskets': 'baskets-and-trolleys',
  'wire-and-metal-retail-displays': 'wire-and-metal-retail-displays',
  'acrylic-and-wire': 'wire-and-metal-retail-displays',
  'acrylic-displays': 'wire-and-metal-retail-displays',
  'acryalic-displays': 'wire-and-metal-retail-displays',
};

const preferredOrderBySlug = new Map(
  preferredCategoryOrder.map((name, index) => [slugifyCategory(name), index])
);

const getPreferredOrderIndex = (category, exactPreferredSlugsPresent) => {
  const slug = slugifyCategory(category?.name || '');
  const aliasSlug = categoryOrderAliases[slug];
  const orderSlug = aliasSlug && !exactPreferredSlugsPresent.has(aliasSlug) ? aliasSlug : slug;
  return preferredOrderBySlug.get(orderSlug);
};

export const sortCategoriesByPreferredOrder = (categories = []) => {
  const exactPreferredSlugsPresent = new Set(
    categories
      .map((category) => slugifyCategory(category?.name || ''))
      .filter((slug) => preferredOrderBySlug.has(slug))
  );

  return [...categories]
    .map((category, index) => ({ category, index }))
    .sort((left, right) => {
      const leftOrder = getPreferredOrderIndex(left.category, exactPreferredSlugsPresent);
      const rightOrder = getPreferredOrderIndex(right.category, exactPreferredSlugsPresent);

      if (leftOrder == null && rightOrder == null) return left.index - right.index;
      if (leftOrder == null) return 1;
      if (rightOrder == null) return -1;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.index - right.index;
    })
    .map(({ category }) => category);
};
