import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { PRODUCT_TYPES, resolveProductType } from '../utils/productType';

const formatPriceRange = (product) => {
  const minPrice = Number(product.minPrice);
  const maxPrice = Number(product.maxPrice);
  const basePrice = Number(product.price);

  if (Number.isFinite(minPrice) && Number.isFinite(maxPrice) && maxPrice >= minPrice) {
    if (minPrice === maxPrice) {
      return `£${minPrice}`;
    }
    return `£${minPrice} - £${maxPrice}`;
  }

  if (Number.isFinite(basePrice)) {
    return `£${basePrice}`;
  }

  return '£0';
};

function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const productUrl = `/product/${product.id}`;
  const availableStock = Math.max(
    Number(product.inventory?.onHand ?? 0) - Number(product.inventory?.reserved ?? 0),
    0
  );
  const isOutOfStock = resolveProductType(product) !== PRODUCT_TYPES.CUSTOM && availableStock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product);
  };

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link to={productUrl} className="flex flex-1 flex-col" aria-label={product.name}>
        {product.image ? (
          <div className="flex aspect-square w-full items-center justify-center bg-slate-50 p-2 sm:p-3 lg:p-2">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center bg-slate-100 px-4 text-center text-xs font-medium text-slate-500 sm:text-sm">No image available</div>
        )}
        <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4 lg:gap-1 lg:p-2">
          <h4 className="min-h-[2.75rem] line-clamp-2 text-sm font-bold leading-tight text-slate-900 sm:min-h-[3rem] sm:text-base lg:min-h-[2.15rem] lg:text-[12px]">
            {product.name}
          </h4>
          <div>
            <span className="text-[15px] font-extrabold text-slate-900 sm:text-xl lg:text-[15px]">{formatPriceRange(product)}</span>
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3 pt-1 sm:px-4 sm:pb-4 lg:px-2 lg:pb-2">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="w-full rounded-xl bg-slate-900 px-2 py-2.5 text-xs font-bold leading-none text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:text-sm lg:py-1.5 lg:text-[10px]"
        >
          {isOutOfStock ? 'Out of stock' : t('product.addToCart')}
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
