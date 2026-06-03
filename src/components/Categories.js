import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProducts } from '../context/ProductContext';
import ProductCard from './ProductCard';
import { useLanguage } from '../context/LanguageContext';

const catalogues = [
  { name: 'Wall Bays Catalogue', url: '/downloads/wall-bays.pdf' },
  { name: 'Slatwall Panel Catalogue', url: '/downloads/slatwall.pdf' },
  { name: 'Bakery & Bread Catalogue', url: '/downloads/bakery.pdf' },
  { name: 'Refrigeration Catalogue', url: '/downloads/refrigeration.pdf' },
];

function Categories() {
  const { products, categories } = useProducts();
  const { t } = useLanguage();

  const [selectedCategory, setSelectedCategory] = useState('__all__');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryNav, setShowCategoryNav] = useState(true);
  const [showSubcategoryNav, setShowSubcategoryNav] = useState(true);
  const [categoryPanelWidth, setCategoryPanelWidth] = useState(380);
  const [subcategoryPanelWidth, setSubcategoryPanelWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const [isSubcategoryResizing, setIsSubcategoryResizing] = useState(false);
  const [showFloatingExpandButton, setShowFloatingExpandButton] = useState(false);
  const gridRef = useRef(null);
  const subcategoryGridRef = useRef(null);
  const productsSectionRef = useRef(null);
  const catalogueSectionRef = useRef(null);
  const previousCompactWidthRef = useRef(380);
  const isCategoryPanelNarrow = showCategoryNav && categoryPanelWidth < 330;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const categoryItems = useMemo(() => {
    const fromAdmin = categories.map((category) => ({
      name: category.name,
      image: category.image || products.find((item) => item.categories?.includes(category.name))?.image || '',
      subcategories: (category.subcategories || []).map((subCategory) => ({
        name: subCategory.name,
        image: subCategory.image || products.find((item) => item.subcategories?.includes(subCategory.name))?.image || category.image || '',
      })),
    }));

    return [{ name: '__all__', image: '/store-counter.jpg' }, ...fromAdmin];
  }, [categories, products]);

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

  const displayedCategoryItems = useMemo(() => {
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

  const selectedSubcategoryMeta = useMemo(
    () => selectedCategoryMeta?.subcategories?.find((item) => item.name === selectedSubcategory) || null,
    [selectedCategoryMeta, selectedSubcategory]
  );

  const selectedCategorySubcategories = useMemo(
    () => (selectedCategoryMeta?.name && selectedCategoryMeta.name !== '__all__' ? selectedCategoryMeta.subcategories || [] : []),
    [selectedCategoryMeta]
  );

  useEffect(() => {
    if (selectedCategorySubcategories.length > 0) {
      setShowSubcategoryNav(true);
    } else {
      setShowSubcategoryNav(false);
    }
  }, [selectedCategorySubcategories]);

  useEffect(() => {
    if (selectedCategorySubcategories.length > 0 && showSubcategoryNav) {
      setCategoryPanelWidth((prev) => {
        previousCompactWidthRef.current = Math.min(prev, 380);
        return Math.max(prev, 560);
      });
      return;
    }

    setCategoryPanelWidth((prev) => {
      if (prev <= 380) return prev;
      return previousCompactWidthRef.current || 380;
    });
  }, [selectedCategorySubcategories.length, showSubcategoryNav]);

  const handleResizeStart = useCallback((event) => {
    event.preventDefault();
    setIsResizing(true);
  }, []);

  const handleSubcategoryResizeStart = useCallback((event) => {
    event.preventDefault();
    setIsSubcategoryResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;

    const handleMouseMove = (event) => {
      if (!gridRef.current) return;
      const bounds = gridRef.current.getBoundingClientRect();
      const nextWidth = Math.min(Math.max(event.clientX - bounds.left, 250), 820);
      setCategoryPanelWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  useEffect(() => {
    if (!isSubcategoryResizing) return undefined;

    const handleMouseMove = (event) => {
      if (!subcategoryGridRef.current) return;
      const bounds = subcategoryGridRef.current.getBoundingClientRect();
      const nextWidth = Math.min(Math.max(bounds.right - event.clientX, 200), Math.max(bounds.width - 250, 200));
      setSubcategoryPanelWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsSubcategoryResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isSubcategoryResizing]);

  useEffect(() => {
    if (showCategoryNav) {
      setShowFloatingExpandButton(false);
      return undefined;
    }

    const updateFloatingButtonVisibility = () => {
      if (!productsSectionRef.current) return;
      const productsRect = productsSectionRef.current.getBoundingClientRect();
      const catalogueRect = catalogueSectionRef.current?.getBoundingClientRect();
      const isWithinProducts = productsRect.top < window.innerHeight && productsRect.bottom > 120;
      const isWithinCatalogue = catalogueRect
        ? catalogueRect.top < window.innerHeight && catalogueRect.bottom > 120
        : false;
      setShowFloatingExpandButton(isWithinProducts || isWithinCatalogue);
    };

    updateFloatingButtonVisibility();
    window.addEventListener('scroll', updateFloatingButtonVisibility, { passive: true });
    window.addEventListener('resize', updateFloatingButtonVisibility);

    return () => {
      window.removeEventListener('scroll', updateFloatingButtonVisibility);
      window.removeEventListener('resize', updateFloatingButtonVisibility);
    };
  }, [showCategoryNav]);

  useEffect(() => {
    const hasSelected = displayedCategoryItems.some((item) => item.name === selectedCategory);
    if (!hasSelected) {
      setSelectedCategory('__all__');
      setSelectedSubcategory(null);
    }
  }, [displayedCategoryItems, selectedCategory]);

  const handleCategorySelect = useCallback((categoryName) => {
    if (categoryName === '__all__') {
      setSelectedCategory('__all__');
      setSelectedSubcategory(null);
      return;
    }

    setSelectedCategory(categoryName);
    setSelectedSubcategory(null);

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowCategoryNav(false);
      window.requestAnimationFrame(() => {
        productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  const handleSubcategorySelect = useCallback((categoryName, subcategoryName) => {
    setSelectedCategory(categoryName);
    setSelectedSubcategory(subcategoryName);

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowCategoryNav(false);
      window.requestAnimationFrame(() => {
        productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  return (
    <section className="py-10">
      <div className="mx-auto w-[min(1500px,100%-1.5rem)]">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{t('categories.shopByCategory')}</p>
        <h2 className="mt-2 text-4xl font-bold text-slate-900 sm:text-5xl">{t('categories.chooseCategory')}</h2>
        <p className="mt-3 max-w-4xl text-base text-slate-600">{t('categories.categoryHelp')}</p>
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div
        ref={gridRef}
        className="grid grid-cols-1 gap-4 lg:gap-6 lg:[grid-template-columns:var(--category-layout)]"
        style={{
          '--category-layout': showCategoryNav
            ? `${categoryPanelWidth}px 28px minmax(0,1fr)`
            : 'minmax(0,1fr)',
        }}
      >
        {showCategoryNav && (
        <aside className="p-1 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-2.5">
          <div
            ref={subcategoryGridRef}
            className={`grid gap-4 ${
              selectedCategorySubcategories.length > 0
                ? showSubcategoryNav
                  ? 'lg:[grid-template-columns:var(--subcategory-layout)]'
                  : 'lg:[grid-template-columns:minmax(0,1fr)_24px]'
                : 'grid-cols-1'
            }`}
            style={{
              '--subcategory-layout': `minmax(250px, calc(100% - ${subcategoryPanelWidth + 24}px)) 24px ${subcategoryPanelWidth}px`,
            }}
          >
            <div>
              <h3 className="mb-3 pb-1 pt-1 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                {t('categories.categories')}
              </h3>
              <div className={`modern-thin-scrollbar grid max-h-[60vh] gap-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-11rem)] ${
                selectedCategorySubcategories.length > 0 && showSubcategoryNav
                  ? 'grid-cols-1'
                  : isCategoryPanelNarrow
                    ? 'grid-cols-1'
                    : 'grid-cols-2'
              }`}>
                {displayedCategoryItems.map((category) => {
                  const isActive = selectedCategory === category.name;
                  const hasSubcategories = (category.subcategories || []).length > 0;
                  return (
                    <button
                      key={category.name}
                      type="button"
                      onClick={() => handleCategorySelect(category.name)}
                      className={`w-full rounded-xl p-1.5 text-left transition ${
                        isActive ? 'bg-primary text-white' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 p-1">
                        <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-100">
                          {category.image ? (
                            <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`truncate text-[13px] font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                              {category.name === '__all__' ? t('categories.allProducts') : category.name}
                            </p>
                            {hasSubcategories && (
                              <span className={`inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                +
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] font-semibold ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                            {categoryCounts[category.name] || 0} {t('categories.items')}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedCategorySubcategories.length > 0 && (
              <div className="relative hidden lg:block">
                {showSubcategoryNav && (
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize category and subcategory area"
                    onMouseDown={handleSubcategoryResizeStart}
                    className="absolute inset-y-0 left-1/2 z-10 w-4 -translate-x-1/2 cursor-col-resize"
                  />
                )}
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-red-500" />
                <div className="sticky top-1/2 z-10 flex -translate-y-1/2 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowSubcategoryNav((prev) => !prev)}
                    aria-label={showSubcategoryNav ? 'Hide subcategory navigation' : 'Show subcategory navigation'}
                    className={`inline-flex h-10 items-center justify-center rounded-full text-lg font-bold shadow-md transition ${
                      showSubcategoryNav
                        ? 'w-11 border border-slate-400 bg-white text-slate-800 hover:border-slate-500 hover:bg-slate-50'
                        : 'w-auto gap-2 border border-primary bg-primary px-3 text-white hover:bg-red-700'
                    }`}
                  >
                    <span>{showSubcategoryNav ? '\u203A' : '\u2039'}</span>
                    {!showSubcategoryNav && <span className="text-xs font-extrabold uppercase tracking-[0.08em]">Subcategories</span>}
                  </button>
                </div>
              </div>
            )}

            {selectedCategorySubcategories.length > 0 && showSubcategoryNav && (
              <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
                <h3 className="mb-3 pb-1 pt-1 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                  Subcategories
                </h3>
                <div className="modern-thin-scrollbar grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto lg:max-h-[calc(100vh-11rem)]">
                  {selectedCategorySubcategories.map((subCategory) => {
                    const isSubcategoryActive = selectedSubcategory === subCategory.name;
                    return (
                      <button
                        key={subCategory.name}
                        type="button"
                        onClick={() => handleSubcategorySelect(selectedCategory, subCategory.name)}
                        className={`box-border w-full rounded-xl p-1.5 text-left transition ${
                          isSubcategoryActive
                            ? 'bg-primary text-white'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 p-1">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {subCategory.image ? (
                              <img src={subCategory.image} alt={subCategory.name} className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-[13px] font-bold ${isSubcategoryActive ? 'text-white' : 'text-slate-900'}`}>
                              {subCategory.name}
                            </p>
                            <p className={`text-[11px] font-semibold ${isSubcategoryActive ? 'text-blue-100' : 'text-slate-500'}`}>
                              {categoryCounts[subCategory.name] || 0} {t('categories.items')}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          </div>
        </aside>
        )}

        {showCategoryNav && (
          <div className="relative">
            <div className="flex justify-center lg:hidden">
              <button
                type="button"
                onClick={() => setShowCategoryNav((prev) => !prev)}
                aria-label={showCategoryNav ? 'Hide category navigation' : 'Show category navigation'}
                className={`inline-flex h-10 items-center justify-center rounded-full text-base font-bold shadow-sm transition ${
                  showCategoryNav
                    ? 'w-10 border border-slate-400 bg-white text-slate-800 hover:border-slate-500 hover:bg-slate-50'
                    : 'w-auto gap-2 border border-primary bg-primary px-3 text-white hover:bg-red-700'
                }`}
              >
                <span>{showCategoryNav ? '\u2039' : '\u203A'}</span>
                {!showCategoryNav && <span className="text-xs font-extrabold uppercase tracking-[0.08em]">Categories</span>}
              </button>
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize category and products area"
              onMouseDown={handleResizeStart}
              className="absolute inset-y-0 left-1/2 hidden w-4 -translate-x-1/2 cursor-col-resize lg:block"
            />
            <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-red-500 lg:block" />
            <div className="sticky top-1/2 z-10 hidden -translate-y-1/2 justify-center lg:flex">
              <button
                type="button"
                onClick={() => setShowCategoryNav((prev) => !prev)}
                aria-label={showCategoryNav ? 'Hide category navigation' : 'Show category navigation'}
                className={`inline-flex h-11 items-center justify-center rounded-full text-xl font-bold shadow-md transition ${
                  showCategoryNav
                    ? 'w-11 border border-slate-400 bg-white text-slate-800 hover:border-slate-500 hover:bg-slate-50'
                    : 'w-auto gap-2 border border-primary bg-primary px-3 text-white hover:bg-red-700'
                }`}
              >
                <span>{showCategoryNav ? '\u2039' : '\u203A'}</span>
                {!showCategoryNav && <span className="text-xs font-extrabold uppercase tracking-[0.08em]">Categories</span>}
              </button>
            </div>
          </div>
        )}

        <div ref={productsSectionRef}>
          {!showCategoryNav && (
            <div className="sticky top-24 z-20 mb-3 flex justify-start">
              <button
                type="button"
                onClick={() => setShowCategoryNav(true)}
                aria-label="Show category navigation"
                className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-white shadow-md transition hover:bg-red-700 lg:hidden"
              >
                <span>{'\u203A'}</span>
                <span>Categories</span>
              </button>
            </div>
          )}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white/95 p-5 backdrop-blur lg:sticky lg:top-24 lg:z-20">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-3xl font-bold text-slate-900">
                {selectedCategory === '__all__'
                  ? t('categories.allProducts')
                  : selectedSubcategory
                    ? `${selectedCategory} / ${selectedSubcategory}`
                    : selectedCategory}
              </h3>
              {!showCategoryNav && (
                <button
                  type="button"
                  onClick={() => setShowCategoryNav(true)}
                  aria-label="Expand category section"
                  className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-red-700 lg:hidden"
                >
                  <span>{'\u203A'}</span>
                  <span>Categories</span>
                </button>
              )}
            </div>
            <p className="mt-2 text-base text-slate-600">
              {t('categories.showing')} <span className="font-bold text-slate-900">{filteredProducts.length}</span> {t('categories.products')}
            </p>
          </div>

          {!showCategoryNav && showFloatingExpandButton && (
            <div className="fixed bottom-5 left-5 z-40 lg:hidden">
              <button
                type="button"
                onClick={() => setShowCategoryNav(true)}
                aria-label="Expand category section"
                className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-white shadow-lg transition hover:bg-red-700"
              >
                <span>{'\u203A'}</span>
                <span>Categories</span>
              </button>
            </div>
          )}

          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="h-60 bg-slate-100">
              {selectedCategoryMeta?.image ? (
                <img src={(selectedSubcategoryMeta?.image || selectedCategoryMeta.image)} alt={(selectedSubcategoryMeta?.name || selectedCategoryMeta.name)} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500">{t('categories.noCategoryImage')}</div>
              )}
            </div>
          </div>

          <div className={`relative ${!showCategoryNav ? 'lg:pl-12' : ''}`}>
            {!showCategoryNav && (
              <div className="absolute left-0 top-0 bottom-0 hidden lg:flex">
                <div className="relative w-10">
                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-red-500" />
                  <div className="sticky top-1/2 z-10 flex -translate-y-1/2 justify-center">
                    <button
                      type="button"
                      onClick={() => setShowCategoryNav(true)}
                      aria-label="Show category navigation"
                      className="inline-flex h-11 min-w-[52px] items-center justify-center rounded-full border border-primary bg-primary px-3 text-xl font-bold text-white shadow-md transition hover:bg-red-700"
                    >
                      <span>{'\u203A'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 ${showCategoryNav ? 'xl:grid-cols-5 2xl:grid-cols-6' : 'xl:grid-cols-6'}`}>
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>

      <div ref={catalogueSectionRef} className="mt-14 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h3 className="text-2xl font-bold text-slate-900">{t('categories.downloadTitle')}</h3>
        <p className="mt-2 text-slate-600">{t('categories.downloadDesc')}</p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {catalogues.map((cat) => (
            <a
              key={cat.name}
              href={cat.url}
              download
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <p className="text-sm font-bold text-slate-900">{cat.name}</p>
              <p className="mt-1 text-xs font-semibold text-blue-700">{t('categories.downloadPdf')}</p>
            </a>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
}

export default Categories;
