import { slugifyCategory } from './categoryRoutes';

const preferredCategoryOrder = [
  'Shop Shelving',
  'Wall shelves',
  'Gondola shelves',
  'Magazine shelves',
  'Greeting card shelves',
  'Shop Flooring',
  'Boards',
  'Ceiling grids',
  'Led Lights',
  'Neon Signage Lights',
  'Decorative panel',
  'Gondola end panels',
  'Veg table shelves',
  'Hooks',
  'Baskets',
  'Vape counters',
  'Acryalic Displays',
];

const categoryOrderAliases = {
  'wall-bays': 'wall-shelves',
  'gondola-shelving': 'gondola-shelves',
  'grid-ceilings': 'ceiling-grids',
  'shop-led-lights': 'led-lights',
  'led-shop-lighting': 'led-lights',
  'neon-signage-lights': 'neon-signage-lights',
  'decorative-panel': 'decorative-panel',
  'end-panels-and-boards': 'gondola-end-panels',
  'fruit-and-veg-shelving': 'veg-table-shelves',
  'baskets-and-trolleys': 'baskets',
  'tobacco-and-vape': 'vape-counters',
  'acrylic-and-wire': 'acryalic-displays',
  'acrylic-displays': 'acryalic-displays',
  'wire-and-metal-retail-displays': 'acryalic-displays',
};

const preferredOrderBySlug = new Map(
  preferredCategoryOrder.map((name, index) => [slugifyCategory(name), index])
);

const getPreferredOrderIndex = (category) => {
  const slug = slugifyCategory(category?.name || '');
  const orderSlug = categoryOrderAliases[slug] || slug;
  return preferredOrderBySlug.get(orderSlug);
};

export const sortCategoriesByPreferredOrder = (categories = []) =>
  [...categories]
    .map((category, index) => ({ category, index }))
    .sort((left, right) => {
      const leftOrder = getPreferredOrderIndex(left.category);
      const rightOrder = getPreferredOrderIndex(right.category);

      if (leftOrder == null && rightOrder == null) return left.index - right.index;
      if (leftOrder == null) return 1;
      if (rightOrder == null) return -1;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.index - right.index;
    })
    .map(({ category }) => category);
