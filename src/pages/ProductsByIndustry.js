import React, { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Seo from '../components/Seo';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';

function ProductsByIndustry() {
  const { industry } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { products, loadAllProducts } = useProducts();

  useEffect(() => {
    loadAllProducts();
  }, [loadAllProducts]);
  const formattedIndustry = useMemo(
    () => (industry ? decodeURIComponent(industry).replace(/-/g, ' ') : null),
    [industry]
  );
  const query = searchParams.get('q')?.trim() || '';
  const searchTerms = useMemo(
    () => query.toLowerCase().split(/\s+/).filter(Boolean),
    [query]
  );
  const seoTitle = formattedIndustry
    ? `${formattedIndustry} Shop Fittings`
    : query
      ? `Search results for "${query}"`
      : 'Products by Industry';
  const seoDescription = formattedIndustry
    ? `Browse Elmshelf retail shelving, counters, refrigeration, and display fixtures for ${formattedIndustry} businesses.`
    : query
      ? `Explore Elmshelf search results for ${query} across retail shelving, displays, and store fixtures.`
      : 'Browse retail shelving, displays, and store equipment by industry to find the right fit for your shop.';

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesIndustry = formattedIndustry
          ? product.industries?.some((ind) => ind.toLowerCase() === formattedIndustry.toLowerCase())
          : true;

        if (!matchesIndustry) {
          return false;
        }

        if (searchTerms.length === 0) {
          return true;
        }

        const searchableContent = [
          product.name,
          product.description,
          ...(product.categories || []),
          ...(product.industries || []),
        ]
          .join(' ')
          .toLowerCase();

        return searchTerms.every((term) => searchableContent.includes(term));
      }),
    [formattedIndustry, products, searchTerms]
  );

  return (
    <section className="shell py-10">
      <Seo title={seoTitle} description={seoDescription} />
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        {query ? (
          <p className="text-lg font-bold text-slate-900 sm:text-2xl">
            {t('productsPage.searchResults', undefined, { query })}
          </p>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{t('productsPage.industryCatalog')}</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{t('productsPage.title')}</h1>
          </>
        )}
        {formattedIndustry && !query && (
          <p className="mt-3 text-slate-600">
            {t('productsPage.showingFor', undefined, { industry: formattedIndustry })}
          </p>
        )}
        {!formattedIndustry && !query && (
          <p className="mt-3 text-slate-600">{t('productsPage.help')}</p>
        )}
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          {t('productsPage.noProducts')}
        </div>
      )}
    </section>
  );
}

export default ProductsByIndustry;
