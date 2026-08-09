export const SHIPPING_FEES = {
  pickup: 0,
  standard: 30,
  boards: 180,
};

const BOARDS_CATEGORY_SLUG = 'boards';
const BOARDS_STANDARD_SHIPPING_SLUG = 'inserts-corner-trims';

const slugifyCategory = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeCategory = (category = {}, parentId = null) => ({
  id: category.id ?? null,
  name: category.name || '',
  slug: category.slug || slugifyCategory(category.name),
  parentId: category.parentId ?? category.parent_id ?? parentId ?? null,
  subcategories: Array.isArray(category.subcategories)
    ? category.subcategories.map((child) => normalizeCategory(child, category.id ?? null))
    : [],
});

const flattenCategories = (categories = [], parentId = null) =>
  categories.flatMap((category) => {
    const normalized = normalizeCategory(category, parentId);
    return [
      normalized,
      ...flattenCategories(normalized.subcategories, normalized.id),
    ];
  });

const getCategoryAncestorSlugs = (category, categoryById) => {
  const slugs = new Set();
  let current = category;
  const visitedIds = new Set();

  while (current) {
    if (current.slug) slugs.add(current.slug);
    if (!current.parentId || visitedIds.has(current.parentId)) break;
    visitedIds.add(current.parentId);
    current = categoryById.get(current.parentId);
  }

  return slugs;
};

const getItemCategorySlugs = (item = {}, categories = []) => {
  const categoryById = new Map(
    flattenCategories(categories)
      .filter((category) => category.id != null)
      .map((category) => [category.id, category])
  );
  const slugs = new Set();

  (item.categoryDetails || []).forEach((rawCategory) => {
    const category = normalizeCategory(rawCategory);
    const categoryWithTreeData = category.id != null && categoryById.has(category.id)
      ? { ...categoryById.get(category.id), slug: category.slug || categoryById.get(category.id).slug }
      : category;
    getCategoryAncestorSlugs(categoryWithTreeData, categoryById).forEach((slug) => slugs.add(slug));
  });

  (item.categories || []).forEach((name) => slugs.add(slugifyCategory(name)));
  (item.subcategories || []).forEach((name) => slugs.add(slugifyCategory(name)));

  return slugs;
};

export const itemTriggersBoardsShipping = (item, categories = []) => {
  const slugs = getItemCategorySlugs(item, categories);
  return slugs.has(BOARDS_CATEGORY_SLUG) && !slugs.has(BOARDS_STANDARD_SHIPPING_SLUG);
};

export const calculateShippingFee = (items = [], deliveryMode = 'ship', categories = []) => {
  if ((deliveryMode || 'ship').trim().toLowerCase() === 'pickup') {
    return SHIPPING_FEES.pickup;
  }

  return items.some((item) => itemTriggersBoardsShipping(item, categories))
    ? SHIPPING_FEES.boards
    : SHIPPING_FEES.standard;
};

export const formatShippingFee = (fee) => `\u00a3${Number(fee || 0).toFixed(2)}`;
