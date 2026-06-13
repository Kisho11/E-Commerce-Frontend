import React from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from '../components/Seo';
import { useProducts } from '../context/ProductContext';

function Catalogue() {
  const { categories } = useProducts();
  const navigate = useNavigate();

  return (
    <div className="py-10">
      <Seo
        title="Catalogue"
        description="Browse Elmshelf catalogues for shelving, refrigeration, slatwall panels, bakery displays, and other retail fit-out products."
      />
      <div className="mx-auto w-[min(1400px,100%-1.5rem)]">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Browse by Category</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900 sm:text-5xl">Our Catalogue</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Browse our full range of shop-fitting products by category.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => navigate(`/categories`)}
              className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-primary hover:shadow-md"
            >
              <div className="mb-3 h-28 w-full overflow-hidden rounded-lg bg-slate-100">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : null}
              </div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-primary">{category.name}</p>
              {(category.subcategories || []).length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  {category.subcategories.length} subcategorie{category.subcategories.length !== 1 ? 's' : ''}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Catalogue;
