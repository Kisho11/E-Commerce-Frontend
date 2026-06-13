import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
import UiIcon from '../components/UiIcon';
import ProductContentRenderer from '../components/ProductContentRenderer';
import Seo from '../components/Seo';
import { getProductPriceDisplay, PRODUCT_TYPES, resolveProductType } from '../utils/productType';

const uiConfig = {
  rating: 4,
  reviewCount: 117,
};

const deriveAttributeOptions = (product = {}) => {
  const grouped = new Map();

  (product.variantPricing || []).forEach((row) => {
    const attributes = row.attributes && typeof row.attributes === 'object' ? row.attributes : null;
    if (attributes && Object.keys(attributes).length > 0) {
      Object.entries(attributes).forEach(([attribute, value]) => {
        if (!attribute || !value) return;
        if (!grouped.has(attribute)) grouped.set(attribute, new Set());
        grouped.get(attribute).add(value);
      });
      return;
    }

    const attribute = `${row.attribute || ''}`.trim();
    const value = `${row.value || ''}`.trim();
    if (!attribute || !value || attribute.toLowerCase() === 'combination') return;
    if (!grouped.has(attribute)) grouped.set(attribute, new Set());
    grouped.get(attribute).add(value);
  });

  if (grouped.size === 0) {
    if (Array.isArray(product.colors) && product.colors.length > 0) {
      grouped.set('Color', new Set(product.colors));
    }
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      grouped.set('Size', new Set(product.sizes));
    }
  }

  return Array.from(grouped.entries()).map(([name, values]) => ({
    name,
    values: [...values],
  }));
};

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { products } = useProducts();
  const product = products.find((p) => p.id === parseInt(id, 10));

  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isHoverZoomed, setIsHoverZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%');

  const productType = useMemo(() => resolveProductType(product), [product]);
  const priceDisplay = useMemo(() => getProductPriceDisplay(product), [product]);
  const attributeOptions = useMemo(() => deriveAttributeOptions(product), [product]);
  const gallery = useMemo(() => {
    if (!product) return [];
    return product.galleryImages?.length > 0
      ? [product.image, ...product.galleryImages].filter(Boolean)
      : [product.image, product.image, product.image, product.image].filter(Boolean);
  }, [product]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setIsHoverZoomed(false);
    setZoomOrigin('50% 50%');
  }, [product?.id]);

  useEffect(() => {
    setSelectedAttributes(
      Object.fromEntries(attributeOptions.map((attribute) => [attribute.name, attribute.values[0] || '']))
    );
    setQuantity(1);
  }, [product?.id, attributeOptions]);

  useEffect(() => {
    const variantImages = product?.variantImages;
    if (!variantImages?.length || !Object.keys(selectedAttributes).length) return;
    let bestIdx = -1;
    let bestScore = 0;
    variantImages.forEach(({ attributes, imageUrl, imageIndex }) => {
      if (!attributes) return;
      let score = 0;
      Object.entries(attributes).forEach(([attr, val]) => {
        if (selectedAttributes[attr] === val) score++;
      });
      if (score > 0 && score > bestScore) {
        let idx = -1;
        if (typeof imageIndex === 'number' && imageIndex < gallery.length) {
          idx = imageIndex;
        } else if (imageUrl) {
          idx = gallery.indexOf(imageUrl);
        }
        if (idx !== -1) { bestScore = score; bestIdx = idx; }
      }
    });
    if (bestIdx !== -1) setSelectedImageIndex(bestIdx);
  }, [selectedAttributes, product?.variantImages, gallery]);

  if (!product) {
    return (
      <div className="shell py-16 text-center">
        <h1 className="mb-4 text-3xl sm:text-4xl font-bold text-primary">Product Not Found</h1>
        <p className="mb-8 text-slate-600">The product you are looking for does not exist.</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition hover:bg-red-700"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const selectedImage = gallery[selectedImageIndex] || product.image;
  const breadcrumbs = [product.categories?.[0], product.industries?.[0], product.name].filter(Boolean);
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: gallery.map((image) => new URL(image, window.location.origin).toString()),
    category: product.categories?.join(', '),
    brand: {
      '@type': 'Brand',
      name: 'Elmshelf',
    },
    offers: productType === PRODUCT_TYPES.CUSTOM
      ? {
          '@type': 'Offer',
          priceCurrency: 'GBP',
          availability: 'https://schema.org/InStock',
          url: window.location.href,
        }
      : {
          '@type': 'Offer',
          priceCurrency: 'GBP',
          price: String(priceDisplay.numericPrice ?? product.salePrice ?? product.price ?? ''),
          availability: 'https://schema.org/InStock',
          url: window.location.href,
        },
  };

  const handleAddToCart = (event) => {
    event.preventDefault();
    addToCart(product, {
      attributes: selectedAttributes,
      quantity,
    });
  };

  const normalizeQuantity = (next) => {
    const parsed = Number(next);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(50, Math.max(1, parsed));
  };

  const handleImageMouseMove = (event) => {
    if (!isHoverZoomed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  };

  return (
    <div className="bg-white pb-10">
      <Seo
        title={product.name}
        description={product.description}
        image={product.image || '/main.webp'}
        type="product"
        canonicalPath={`/product/${product.id}`}
        structuredData={productSchema}
      />
      <div className="pt-6">
        <nav aria-label="Breadcrumb" className="shell">
          <ol className="mx-auto flex max-w-7xl items-center space-x-2 px-2 sm:px-4">
            {breadcrumbs.map((crumb, idx) => (
              <li key={`${crumb}-${idx}`}>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => (idx < breadcrumbs.length - 1 ? navigate('/products-by-industry') : null)}
                    className={`mr-2 text-sm font-medium ${idx < breadcrumbs.length - 1 ? 'text-slate-900 hover:text-primary' : 'text-slate-500'}`}
                  >
                    {crumb}
                  </button>
                  {idx < breadcrumbs.length - 1 && (
                    <svg viewBox="0 0 16 20" width="16" height="20" fill="currentColor" aria-hidden="true" className="h-5 w-4 text-slate-300">
                      <path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" />
                    </svg>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </nav>

        <div className="shell mx-auto mt-6 max-w-7xl px-2 sm:px-4 lg:grid lg:grid-cols-2 lg:gap-10">
          <div>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <img
                  src={selectedImage}
                  alt={`${product.name} angle ${selectedImageIndex + 1}`}
                  className={`h-[380px] w-full object-cover transition duration-200 sm:h-[480px] lg:h-[560px] ${
                    isHoverZoomed ? 'scale-[1.9] cursor-zoom-out' : 'scale-100 cursor-zoom-in'
                  }`}
                  style={{ transformOrigin: zoomOrigin }}
                  onMouseEnter={() => setIsHoverZoomed(true)}
                  onMouseMove={handleImageMouseMove}
                  onMouseLeave={() => {
                    setIsHoverZoomed(false);
                    setZoomOrigin('50% 50%');
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">Hover image to zoom, move cursor to inspect details.</p>

              {gallery.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {gallery.map((image, idx) => (
                    <button
                      key={`thumb-${idx}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`overflow-hidden rounded-md border-2 transition ${
                        selectedImageIndex === idx ? 'border-primary' : 'border-slate-200 hover:border-slate-300'
                      }`}
                      aria-label={`View angle ${idx + 1}`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} thumbnail ${idx + 1}`}
                        className="h-16 w-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {gallery.length > 1 ? (
                <p className="mt-3 text-sm font-medium text-slate-600">
                  Viewing angle {selectedImageIndex + 1} of {gallery.length}
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Add `galleryImages` to this product to enable multi-angle view.
                </p>
              )}
            </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{product.name}</h1>
            <p className={`mt-4 text-3xl tracking-tight ${productType === PRODUCT_TYPES.CUSTOM ? 'text-slate-600' : 'text-slate-900'}`}>
                  {priceDisplay.text}
                </p>

            <div className="mt-4 flex items-center">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <UiIcon key={i} name="star" className={`h-5 w-5 ${i < uiConfig.rating ? 'text-slate-900' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <button type="button" className="ml-3 text-sm font-medium text-primary hover:text-red-700">
                    {uiConfig.reviewCount} reviews
                  </button>
                </div>

            <form className="mt-8" onSubmit={handleAddToCart}>
              {productType === PRODUCT_TYPES.VARIABLE && attributeOptions.length > 0 && (
                <div className="space-y-6">
                  {attributeOptions.map((attribute) => (
                    <div key={attribute.name}>
                      <label className="mb-2 block text-sm font-medium text-slate-900">
                        {attribute.name}
                      </label>
                      <div className="relative">
                        <select
                          value={selectedAttributes[attribute.name] || ''}
                          onChange={(event) =>
                            setSelectedAttributes((prev) => ({
                              ...prev,
                              [attribute.name]: event.target.value,
                            }))
                          }
                          className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-red-100"
                        >
                          {attribute.values.map((value) => (
                            <option key={`${attribute.name}:${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                          <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
                            <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {productType !== PRODUCT_TYPES.CUSTOM && (
                <div className="mt-8">
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Quantity</label>
                  <div className="inline-flex items-center rounded-lg border border-slate-300">
                    <button
                      onClick={() => setQuantity((prev) => normalizeQuantity(prev - 1))}
                      className="px-3 py-2 text-slate-700"
                      type="button"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={quantity}
                      onChange={(e) => setQuantity(normalizeQuantity(e.target.value))}
                      className="w-16 border-x border-slate-300 px-2 py-2 text-center focus:outline-none"
                    />
                    <button
                      onClick={() => setQuantity((prev) => normalizeQuantity(prev + 1))}
                      className="px-3 py-2 text-slate-700"
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {productType === PRODUCT_TYPES.CUSTOM ? (
                <button
                  type="button"
                  onClick={() => navigate('/clients')}
                  className="mt-10 flex w-full items-center justify-center rounded-md border border-transparent bg-primary px-8 py-3 text-base font-medium text-white hover:bg-red-700"
                >
                  Request Quote
                </button>
              ) : (
                <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-primary px-8 py-3 text-base font-medium text-white hover:bg-red-700"
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/checkout')}
                    className="flex w-full items-center justify-center rounded-md border border-green-700 bg-green-600 px-8 py-3 text-base font-medium text-white hover:bg-green-700"
                  >
                    Checkout
                  </button>
                </div>
              )}
            </form>

            <div className="mt-10">
                  <p className="text-base text-slate-900">{product.description}</p>
                </div>

            {product.specs && (
              <div className="mt-10">
                    <h3 className="text-sm font-medium text-slate-900">Highlights</h3>
                    <div className="mt-4">
                      <ul className="list-disc space-y-2 pl-4 text-sm">
                        {Object.entries(product.specs).map(([key, value]) => (
                          <li key={key} className="text-slate-400">
                            <span className="text-slate-600">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}: {value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
          </div>
        </div>

        {product.additionalInformation?.blocks?.some((block) => {
          if (block.type === 'image') return Boolean(block.src);
          if (block.type === 'bullet-list' || block.type === 'number-list') return (block.items || []).some(Boolean);
          return Boolean(block.html);
        }) && (
          <div className="shell mx-auto mt-12 max-w-7xl px-2 sm:px-4">
            <div className="border-t border-slate-200 pt-8 text-left">
              <h3 className="mb-4 text-sm font-medium text-slate-900">Additional Information</h3>
              <div className="max-w-none">
                <ProductContentRenderer content={product.additionalInformation} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetail;
