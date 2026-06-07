import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Seo from '../components/Seo';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';

function CategoriesPage() {
  const { categories, products, productsLoading, productsError } = useProducts();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('__all__');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const productsSectionRef = useRef(null);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const categoryFromQuery = searchParams.get('category');
  const hasFocusedCategory = Boolean(
    categoryFromQuery && categories.some((category) => category.name === categoryFromQuery)
  );

  const categoryItems = useMemo(
    () => [
      { name: '__all__', image: '/store-counter.jpg', subcategories: [] },
      ...categories.map((category) => ({
        ...category,
        subcategories: (category.subcategories || []).map((subCategory) => ({
          ...subCategory,
          image: subCategory.image || category.image || '',
        })),
      })),
    ],
    [categories]
  );

  const searchedProducts = useMemo(() => {
    if (!normalizedSearch) return products;
    return products.filter((item) => {
      const searchable = [
        item.name,
        item.description,
        ...(item.categories || []),
        ...(item.subcategories || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [normalizedSearch, products]);

  const filteredCategoryItems = useMemo(() => {
    if (!normalizedSearch) return categoryItems;
    return categoryItems.filter((category) => {
      if (category.name === '__all__') return true;
      const categoryName = String(category.name || '').toLowerCase();
      const hasMatchingSubcategory = (category.subcategories || []).some((subCategory) =>
        String(subCategory.name || '').toLowerCase().includes(normalizedSearch)
      );
      const hasMatchingProduct = searchedProducts.some((item) =>
        (item.categories || []).includes(category.name)
      );
      return categoryName.includes(normalizedSearch) || hasMatchingSubcategory || hasMatchingProduct;
    });
  }, [categoryItems, normalizedSearch, searchedProducts]);

  const displayedCategoryItems = useMemo(() => {
    if (!hasFocusedCategory || selectedCategory === '__all__') {
      return filteredCategoryItems;
    }

    return filteredCategoryItems.filter((category) => category.name === selectedCategory);
  }, [filteredCategoryItems, hasFocusedCategory, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts = { __all__: searchedProducts.length };
    searchedProducts.forEach((item) => {
      (item.categories || []).forEach((name) => {
        counts[name] = (counts[name] || 0) + 1;
      });
      (item.subcategories || []).forEach((name) => {
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return counts;
  }, [searchedProducts]);

  const filteredProducts = useMemo(() => {
    if (selectedSubcategory) {
      return searchedProducts.filter((item) => item.subcategories?.includes(selectedSubcategory));
    }
    if (selectedCategory === '__all__') return searchedProducts;
    return searchedProducts.filter((item) => item.categories?.includes(selectedCategory));
  }, [searchedProducts, selectedCategory, selectedSubcategory]);

  const selectedCategoryMeta = useMemo(
    () => categoryItems.find((item) => item.name === selectedCategory),
    [categoryItems, selectedCategory]
  );

  const selectedCategorySubcategories = useMemo(
    () => (selectedCategoryMeta?.name && selectedCategoryMeta.name !== '__all__' ? selectedCategoryMeta.subcategories || [] : []),
    [selectedCategoryMeta]
  );

  useEffect(() => {
    const searchFromQuery = searchParams.get('search') || '';

    setSearchQuery(searchFromQuery);

    if (categoryFromQuery && categories.some((category) => category.name === categoryFromQuery)) {
      setSelectedCategory(categoryFromQuery);
      setSelectedSubcategory(null);
      window.requestAnimationFrame(() => {
        productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    setSelectedCategory('__all__');
    setSelectedSubcategory(null);
  }, [categories, categoryFromQuery, searchParams]);

  useEffect(() => {
    const hasSelected = filteredCategoryItems.some((item) => item.name === selectedCategory);
    if (!hasSelected) {
      setSelectedCategory('__all__');
      setSelectedSubcategory(null);
    }
  }, [filteredCategoryItems, selectedCategory]);

  useEffect(() => {
    if (!searchQuery.trim()) return;

    window.requestAnimationFrame(() => {
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [searchQuery, selectedCategory, selectedSubcategory]);

  const handleCategoryClick = (categoryName) => {
    if (categoryName === '__all__') {
      setSelectedCategory('__all__');
      setSelectedSubcategory(null);
      return;
    }

    setSelectedCategory(categoryName);
    setSelectedSubcategory(null);
    window.requestAnimationFrame(() => {
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleSubcategoryClick = (categoryName, subcategoryName) => {
    setSelectedCategory(categoryName);
    setSelectedSubcategory(subcategoryName);
    window.requestAnimationFrame(() => {
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <section className="py-10">
      <Seo
        title="Product Categories"
        description="Explore Elmshelf product categories including shop shelving, displays, refrigeration, checkout counters, and flooring solutions."
      />
      <div className="mx-auto w-[min(1400px,100%-1rem)] sm:w-[min(1400px,100%-1.5rem)]">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{t('categories.shopByCategory')}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">{t('categories.categories')}</h1>
          <p className="mt-3 max-w-4xl text-sm text-slate-600 sm:text-base">Select any category below to jump to matching products.</p>
          <div className="mt-4 max-w-xl">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('slider.searchPlaceholder')}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-200"
            />
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {displayedCategoryItems.map((category) => {
              const isActive = selectedCategory === category.name;
              const displayName = category.name === '__all__' ? t('categories.allProducts') : category.name;
              const hasSubcategories = (category.subcategories || []).length > 0;
              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => handleCategoryClick(category.name)}
                  className={`rounded-xl border p-3 text-left transition sm:p-4 ${
                    isActive
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="mb-2 h-28 w-full overflow-hidden rounded-lg bg-slate-100 sm:h-32">
                    {category.image ? <img src={category.image} alt={displayName} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-sm font-bold sm:text-base ${isActive ? 'text-white' : 'text-slate-900'}`}>{displayName}</p>
                    {hasSubcategories && (
                      <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        +
                      </span>
                    )}
                  </div>
                  <p className={`text-xs font-semibold ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                    {productsLoading ? '…' : `${categoryCounts[category.name] || 0} ${t('categories.items')}`}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedCategorySubcategories.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Subcategories</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {selectedCategorySubcategories.map((subCategory) => {
                  const isSubcategoryActive = selectedSubcategory === subCategory.name;
                  return (
                    <button
                      key={subCategory.name}
                      type="button"
                      onClick={() => handleSubcategoryClick(selectedCategory, subCategory.name)}
                      className={`rounded-xl border px-4 py-4 text-left transition sm:px-5 ${
                        isSubcategoryActive
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <p className="truncate text-sm font-bold">{subCategory.name}</p>
                      <p className={`mt-1 text-xs font-semibold ${isSubcategoryActive ? 'text-blue-100' : 'text-slate-500'}`}>
                        {productsLoading ? '…' : `${categoryCounts[subCategory.name] || 0} ${t('categories.items')}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 border-t border-slate-200" />

        <div ref={productsSectionRef} className="mb-4 rounded-2xl border border-slate-200 bg-white/95 p-5 backdrop-blur">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {selectedCategory === '__all__'
              ? t('categories.allProducts')
              : selectedSubcategory
                ? `${selectedCategory} / ${selectedSubcategory}`
                : selectedCategory}
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {productsLoading
              ? 'Loading products...'
              : <>{t('categories.showing')} <span className="font-bold text-slate-900">{filteredProducts.length}</span> {t('categories.products')}</>}
          </p>
        </div>

        {productsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
          </div>
        ) : productsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
            <p className="font-semibold">Failed to load products</p>
            <p className="mt-1 text-sm">{productsError}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default CategoriesPage;
