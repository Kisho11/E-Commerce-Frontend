import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import CategoryImageFrame from './CategoryImageFrame';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';
import { categoryPath } from '../utils/categoryRoutes';

const FEATURED_CATEGORY = 'Shop Shelving';

function CategoryLanding({ searchQuery = '', showSearch = false, onSearchChange = null }) {
  const navigate = useNavigate();
  const { categories, categoriesLoading, categoriesError, isBackendEnabled, products, productsLoading } = useProducts();
  const { t } = useLanguage();
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const categoryItems = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        image: category.image || (!isBackendEnabled ? products.find((item) => item.categories?.includes(category.name))?.image : '') || '',
      })),
    [categories, isBackendEnabled, products]
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

  const shopShelvingProducts = useMemo(() => {
    const featuredCategory = FEATURED_CATEGORY.toLowerCase();

    return products.filter((product) => {
      const categoryText = [
        ...(product.categories || []),
        ...(product.subcategories || []),
      ]
        .join(' ')
        .toLowerCase();

      const isShopShelvingProduct = categoryText.includes(featuredCategory);
      if (!isShopShelvingProduct) return false;

      if (!normalizedSearch) return true;

      const searchableText = [
        product.name,
        product.description,
        ...(product.categories || []),
        ...(product.subcategories || []),
        ...(product.industries || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [normalizedSearch, products]);

  return (
    <div>
      <div className="mb-8 ml-4 sm:ml-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{t('categories.shopByCategory')}</p>
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
        {categoriesLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={`category-loading-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <CategoryImageFrame loading className="mb-2 h-28 w-full rounded-lg sm:h-32" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : categoriesError ? (
          <p className="py-10 text-center text-sm text-red-600">{categoriesError}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {visibleCategories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => navigate(categoryPath(category.name))}
              className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 sm:p-4"
            >
              <CategoryImageFrame src={category.image} alt={category.name} className="mb-2 h-28 w-full rounded-lg sm:h-32" />
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
        )}

        {!categoriesLoading && !categoriesError && !productsLoading && visibleCategories.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">No categories match your search.</p>
        )}
      </div>

      <section className="mt-10" aria-labelledby="shop-shelving-products-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Featured products</p>
            <h2 id="shop-shelving-products-heading" className="mt-2 text-2xl font-bold text-slate-900 sm:text-4xl">
              {FEATURED_CATEGORY} Products
            </h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              {productsLoading
                ? 'Loading products...'
                : `Showing ${shopShelvingProducts.length} ${FEATURED_CATEGORY} products.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(categoryPath(FEATURED_CATEGORY))}
            className="rounded-full border border-primary bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-red-50"
          >
            View all
          </button>
        </div>

        {productsLoading && shopShelvingProducts.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
          </div>
        ) : shopShelvingProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {shopShelvingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No {FEATURED_CATEGORY} products found.
          </div>
        )}
      </section>
    </div>
  );
}

export default CategoryLanding;
