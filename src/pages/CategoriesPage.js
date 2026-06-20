import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import CategoryLanding from '../components/CategoryLanding';
import ProductCard from '../components/ProductCard';
import Seo from '../components/Seo';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';
import { categoryPath, slugifyCategory } from '../utils/categoryRoutes';

function CategoriesPage() {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, products, fetchProductsPage } = useProducts();
  const { t } = useLanguage();
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [categoryProductsTotal, setCategoryProductsTotal] = useState(0);
  const [categoryProductsPage, setCategoryProductsPage] = useState(1);
  const [categoryProductsPages, setCategoryProductsPages] = useState(1);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);
  const [categoryProductsError, setCategoryProductsError] = useState('');
  const perPage = 36;

  const selectedCategory = useMemo(
    () => categories.find((category) => slugifyCategory(category.name) === categorySlug) || null,
    [categories, categorySlug]
  );
  const isLandingView = !categorySlug || !selectedCategory;

  const categoryItems = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        image: category.image || products.find((item) => item.categories?.includes(category.name))?.image || '',
        subcategories: (category.subcategories || []).map((subcategory) => ({
          ...subcategory,
          image:
            subcategory.image ||
            products.find((item) => item.subcategories?.includes(subcategory.name))?.image ||
            category.image ||
            '',
        })),
      })),
    [categories, products]
  );

  const selectedCategoryMeta = useMemo(
    () => categoryItems.find((category) => category.name === selectedCategory?.name) || null,
    [categoryItems, selectedCategory]
  );
  const selectedSubcategoryMeta = useMemo(
    () => selectedCategoryMeta?.subcategories?.find((item) => item.name === selectedSubcategory) || null,
    [selectedCategoryMeta, selectedSubcategory]
  );
  const activeCategoryId = selectedSubcategoryMeta?.id || selectedCategoryMeta?.id || selectedCategory?.id || null;

  useEffect(() => {
    setSelectedSubcategory(null);
  }, [categorySlug]);

  useEffect(() => {
    const nextSearch = searchParams.get('search') || '';
    setSearchQuery(nextSearch);
  }, [searchParams]);

  const updateSearchQuery = (value) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (isLandingView || !activeCategoryId) return undefined;

    let cancelled = false;
    const loadProducts = async () => {
      setCategoryProductsLoading(true);
      setCategoryProductsError('');
      setCategoryProductsPage(1);
      try {
        const result = await fetchProductsPage({
          page: 1,
          perPage,
          categoryId: activeCategoryId,
          search: searchQuery,
        });
        if (cancelled) return;
        setCategoryProducts(result.items);
        setCategoryProductsTotal(result.total);
        setCategoryProductsPages(result.pages);
      } catch (error) {
        if (cancelled) return;
        setCategoryProducts([]);
        setCategoryProductsTotal(0);
        setCategoryProductsPages(1);
        setCategoryProductsError(error.message || 'Unable to load products');
      } finally {
        if (!cancelled) {
          setCategoryProductsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [activeCategoryId, fetchProductsPage, isLandingView, searchQuery]);

  const loadMoreProducts = async () => {
    if (categoryProductsLoading || categoryProductsPage >= categoryProductsPages) return;
    const nextPage = categoryProductsPage + 1;
    setCategoryProductsLoading(true);
    setCategoryProductsError('');
    try {
      const result = await fetchProductsPage({
        page: nextPage,
        perPage,
        categoryId: activeCategoryId,
        search: searchQuery,
      });
      setCategoryProducts((prev) => [...prev, ...result.items]);
      setCategoryProductsPage(result.page);
      setCategoryProductsTotal(result.total);
      setCategoryProductsPages(result.pages);
    } catch (error) {
      setCategoryProductsError(error.message || 'Unable to load more products');
    } finally {
      setCategoryProductsLoading(false);
    }
  };

  if (isLandingView) {
    return (
      <section className="py-10">
        <Seo
          title="Product Categories"
          description="Browse Elmshelf product categories before choosing a product range."
        />
        <div className="mx-auto w-[min(1400px,100%-1rem)] sm:w-[min(1400px,100%-1.5rem)]">
          <CategoryLanding searchQuery={searchQuery} showSearch onSearchChange={updateSearchQuery} />
        </div>
      </section>
    );
  }

  return (
    <section className="py-10">
      <Seo
        title={`${selectedCategory.name} Products`}
        description={`Browse Elmshelf ${selectedCategory.name} products and related retail fixtures.`}
      />
      <div className="mx-auto w-[min(1500px,100%-1rem)] sm:w-[min(1500px,100%-1.5rem)]">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{t('categories.shopByCategory')}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">{selectedCategory.name}</h1>
          <p className="mt-3 max-w-4xl text-sm text-slate-600 sm:text-base">
            Use the category navigation to switch product ranges.
          </p>
          <div className="mt-4 max-w-xl">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => updateSearchQuery(event.target.value)}
              placeholder={t('slider.searchPlaceholder')}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{t('categories.categories')}</h2>
                <button
                  type="button"
                  onClick={() => navigate('/categories')}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="modern-thin-scrollbar grid max-h-[calc(100svh-12rem)] gap-2 overflow-y-auto pr-1">
                {categoryItems.map((category) => {
                  const isActive = category.name === selectedCategory.name;
                  return (
                    <button
                      key={category.name}
                      type="button"
                      onClick={() => navigate(categoryPath(category.name))}
                      className={`w-full rounded-xl p-2 text-left transition ${
                        isActive ? 'bg-primary text-white' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {category.image ? (
                            <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-[13px] font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                            {category.name}
                          </p>
                          <p className={`text-[11px] font-semibold ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                            {category.name === selectedCategory.name ? `${categoryProductsTotal} ${t('categories.items')}` : 'Browse'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div>
            <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="h-52 bg-slate-100 sm:h-64">
                {(selectedSubcategoryMeta?.image || selectedCategoryMeta?.image) ? (
                  <img
                    src={selectedSubcategoryMeta?.image || selectedCategoryMeta?.image}
                    alt={selectedSubcategory || selectedCategory.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">{t('categories.noCategoryImage')}</div>
                )}
              </div>
            </div>

            {(selectedCategoryMeta?.subcategories || []).length > 0 && (
              <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Subcategories</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategory(null)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      !selectedSubcategory ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All {selectedCategory.name}
                  </button>
                  {selectedCategoryMeta.subcategories.map((subcategory) => (
                    <button
                      key={subcategory.name}
                      type="button"
                      onClick={() => setSelectedSubcategory(subcategory.name)}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                        selectedSubcategory === subcategory.name
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {subcategory.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-5 rounded-2xl border border-slate-200 bg-white/95 p-5 backdrop-blur">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {selectedSubcategory ? `${selectedCategory.name} / ${selectedSubcategory}` : selectedCategory.name}
              </h2>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                {categoryProductsLoading && categoryProducts.length === 0 ? (
                  'Loading products...'
                ) : (
                  <>
                    {t('categories.showing')} <span className="font-bold text-slate-900">{categoryProducts.length}</span>
                    {' '}of <span className="font-bold text-slate-900">{categoryProductsTotal}</span>{' '}
                    {t('categories.products')}
                  </>
                )}
              </p>
            </div>

            {categoryProductsLoading && categoryProducts.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
              </div>
            ) : categoryProductsError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
                <p className="font-semibold">Failed to load products</p>
                <p className="mt-1 text-sm">{categoryProductsError}</p>
              </div>
            ) : categoryProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4 2xl:grid-cols-5">
                  {categoryProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {categoryProductsPage < categoryProductsPages && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={loadMoreProducts}
                      disabled={categoryProductsLoading}
                      className="rounded-full border border-primary bg-white px-6 py-3 text-sm font-bold text-primary transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {categoryProductsLoading ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                No products found for this selection.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CategoriesPage;
