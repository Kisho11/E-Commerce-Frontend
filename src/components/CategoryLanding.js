import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';
import { categoryPath } from '../utils/categoryRoutes';

function CategoryLanding({ searchQuery = '', showSearch = false, onSearchChange = null }) {
  const navigate = useNavigate();
  const { categories, products, productsLoading } = useProducts();
  const { t } = useLanguage();
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const categoryItems = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        image: category.image || products.find((item) => item.categories?.includes(category.name))?.image || '',
      })),
    [categories, products]
  );

  const categoryCounts = useMemo(() => {
    const counts = {};
    products.forEach((item) => {
      (item.categories || []).forEach((name) => {
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return counts;
  }, [products]);

  const visibleCategories = useMemo(() => {
    if (!normalizedSearch) return categoryItems;
    return categoryItems.filter((category) => {
      const categoryName = String(category.name || '').toLowerCase();
      const subcategoryNames = (category.subcategories || [])
        .map((subcategory) => String(subcategory.name || '').toLowerCase())
        .join(' ');
      return categoryName.includes(normalizedSearch) || subcategoryNames.includes(normalizedSearch);
    });
  }, [categoryItems, normalizedSearch]);

  return (
    <div>
      <div className="mb-8 ml-4 sm:ml-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{t('categories.shopByCategory')}</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">{t('categories.chooseCategory')}</h2>
        <p className="mt-3 max-w-4xl text-sm text-slate-600 sm:text-base">
          Select a category first. Products will load after you choose what you want to browse.
        </p>
        {showSearch && (
          <div className="mt-4 max-w-xl">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder={t('slider.searchPlaceholder')}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-200"
            />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {visibleCategories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => navigate(categoryPath(category.name))}
              className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 sm:p-4"
            >
              <div className="mb-2 h-28 w-full overflow-hidden rounded-lg bg-slate-100 sm:h-32">
                {category.image ? (
                  <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-slate-900 sm:text-base">{category.name}</p>
                {(category.subcategories || []).length > 0 && (
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                    +
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500">
                {productsLoading
                  ? '...'
                  : products.length > 0
                    ? `${categoryCounts[category.name] || 0} ${t('categories.items')}`
                    : 'Browse'}
              </p>
            </button>
          ))}
        </div>

        {!productsLoading && visibleCategories.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">No categories match your search.</p>
        )}
      </div>
    </div>
  );
}

export default CategoryLanding;
