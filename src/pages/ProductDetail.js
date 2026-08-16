import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
import UiIcon from '../components/UiIcon';
import BackButton from '../components/BackButton';
import ProductCard from '../components/ProductCard';
import Seo from '../components/Seo';
import { getProductPriceDisplay, PRODUCT_TYPES, resolveProductType } from '../utils/productType';
import { categoryPath } from '../utils/categoryRoutes';
import { recordProductView } from '../utils/analytics';

const uiConfig = {
  rating: 4,
  reviewCount: 117,
};

const deriveAttributeOptions = (product = {}) => {
  const grouped = new Map();

  if (Array.isArray(product.variantGroups) && product.variantGroups.length > 0) {
    product.variantGroups.forEach((group) => {
      const attribute = `${group.attribute || ''}`.trim();
      const values = (group.values || [])
        .map((entry) => `${entry.value || ''}`.trim())
        .filter(Boolean);
      if (!attribute || values.length === 0) return;
      grouped.set(attribute, new Set(values));
    });
  }

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

const formatMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return `£${amount.toFixed(2)}`;
};

const findSelectedVariantPrice = (product = {}, selectedAttributes = {}) => {
  const rows = (product.variantPricing || [])
    .filter((row) => row.attributes && typeof row.attributes === 'object' && Object.keys(row.attributes).length > 0)
    .sort((left, right) => Object.keys(right.attributes || {}).length - Object.keys(left.attributes || {}).length);

  const selected = Object.fromEntries(
    Object.entries(selectedAttributes || {})
      .map(([key, value]) => [`${key || ''}`.trim(), `${value || ''}`.trim()])
      .filter(([key, value]) => key && value)
  );

  const match = rows.find((row) =>
    Object.entries(row.attributes).every(([attribute, value]) => selected[attribute] === `${value || ''}`)
  );

  if (!match) return null;
  if (match.price === '' || match.price == null) {
    const basePrice = Number(product.price || 0);
    return Number.isFinite(basePrice) ? basePrice : null;
  }
  const price = Number(match.price);
  return Number.isFinite(price) ? price : null;
};

const findSelectedVariantStock = (product = {}, selectedAttributes = {}) => {
  const rows = (product.variantPricing || [])
    .filter((row) => row.attributes && typeof row.attributes === 'object' && Object.keys(row.attributes).length > 0)
    .sort((left, right) => Object.keys(right.attributes || {}).length - Object.keys(left.attributes || {}).length);

  const selected = Object.fromEntries(
    Object.entries(selectedAttributes || {})
      .map(([key, value]) => [`${key || ''}`.trim(), `${value || ''}`.trim()])
      .filter(([key, value]) => key && value)
  );

  const match = rows.find((row) => {
    const attributes = row.attributes || {};
    return (
      Object.keys(attributes).length > 0 &&
      Object.keys(attributes).length === Object.keys(selected).length &&
      Object.entries(attributes).every(([attribute, value]) => selected[attribute] === `${value || ''}`)
    );
  });

  if (!match) return null;
  const stock = Number(match.stock || 0);
  return Number.isFinite(stock) ? Math.max(stock, 0) : 0;
};

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { products, loadAllProducts } = useProducts();
  const product = products.find((p) => p.id === parseInt(id, 10));
  const relatedProductsRef = useRef(null);
  const shareMenuRef = useRef(null);
  const [resolvedProductId, setResolvedProductId] = useState(null);
  const [visibleRelatedCount, setVisibleRelatedCount] = useState(4);
  const [canScrollRelatedLeft, setCanScrollRelatedLeft] = useState(false);

  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isHoverZoomed, setIsHoverZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%');
  const [cartError, setCartError] = useState('');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  const productType = useMemo(() => resolveProductType(product), [product]);
  const priceDisplay = useMemo(() => getProductPriceDisplay(product), [product]);
  const attributeOptions = useMemo(() => deriveAttributeOptions(product), [product]);
  const selectedVariantPrice = useMemo(
    () => findSelectedVariantPrice(product, selectedAttributes),
    [product, selectedAttributes]
  );
  const selectedPriceText = productType === PRODUCT_TYPES.VARIABLE && selectedVariantPrice != null
    ? formatMoney(selectedVariantPrice)
    : priceDisplay.text;
  const stockInfo = useMemo(() => {
    if (!product || productType === PRODUCT_TYPES.CUSTOM) {
      return { onHand: null, reserved: 0, available: null, isOutOfStock: false, isLowStock: false };
    }

    const variantStock = productType === PRODUCT_TYPES.VARIABLE
      ? findSelectedVariantStock(product, selectedAttributes)
      : null;
    const onHand = variantStock == null ? Number(product.inventory?.onHand ?? 0) : variantStock;
    const reserved = Number(product.inventory?.reserved ?? 0);
    const reorderLevel = Number(product.inventory?.reorderLevel ?? 0);
    const available = Math.max(onHand - (variantStock == null ? reserved : 0), 0);

    return {
      onHand,
      reserved: variantStock == null ? reserved : 0,
      available,
      isOutOfStock: available <= 0,
      isLowStock: available > 0 && available <= reorderLevel,
    };
  }, [product, productType, selectedAttributes]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const productCategories = new Set(product.categories || []);
    const manualRelatedIds = (product.relatedProductIds || [])
      .map((relatedProductId) => Number(relatedProductId))
      .filter((relatedProductId) => Number.isFinite(relatedProductId) && relatedProductId > 0);
    const manualRelatedIdSet = new Set(manualRelatedIds);
    const productById = new Map(products.map((candidate) => [Number(candidate.id), candidate]));
    const isAvailable = (candidate) => {
      if (resolveProductType(candidate) === PRODUCT_TYPES.CUSTOM) return true;
      return Number(candidate.inventory?.onHand ?? 0) - Number(candidate.inventory?.reserved ?? 0) > 0;
    };
    const isEligibleRelatedProduct = (candidate) => (
      candidate
      && Number(candidate.id) !== Number(product.id)
      && candidate.isActive !== false
    );

    const manualRelatedProducts = manualRelatedIds
      .map((relatedProductId) => productById.get(relatedProductId))
      .filter(isEligibleRelatedProduct);

    const fallbackRelatedProducts = products
      .filter((candidate) => (
        isEligibleRelatedProduct(candidate)
        && !manualRelatedIdSet.has(Number(candidate.id))
        && (candidate.categories || []).some((category) => productCategories.has(category))
      ))
      .sort((left, right) => Number(isAvailable(right)) - Number(isAvailable(left)));

    return [...manualRelatedProducts, ...fallbackRelatedProducts]
      .slice(0, 12);
  }, [product, products]);

  useEffect(() => {
    let isActive = true;

    if (product) {
      setResolvedProductId(id);
      return () => {
        isActive = false;
      };
    }

    loadAllProducts().finally(() => {
      if (isActive) setResolvedProductId(id);
    });

    return () => {
      isActive = false;
    };
  }, [id, loadAllProducts, product]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setIsHoverZoomed(false);
    setZoomOrigin('50% 50%');
    setIsShareMenuOpen(false);
    setShareFeedback('');
  }, [product?.id]);

  useEffect(() => {
    if (!isShareMenuOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setIsShareMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsShareMenuOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isShareMenuOpen]);

  useEffect(() => {
    setVisibleRelatedCount(4);
    setCanScrollRelatedLeft(false);
  }, [product?.id]);

  useEffect(() => {
    setSelectedAttributes(
      Object.fromEntries(attributeOptions.map((attribute) => [attribute.name, attribute.values[0] || '']))
    );
    setQuantity(1);
  }, [product?.id, attributeOptions]);

  useEffect(() => {
    if (!product?.imageVariantTags?.length || Object.keys(selectedAttributes).length === 0) return;
    const allImages = [product.image, ...(product.galleryImages || [])].filter(Boolean);
    for (let i = 0; i < allImages.length; i++) {
      const tag = product.imageVariantTags[i] || '';
      if (!tag) continue;
      const tagAttrs = {};
      tag.split('||').forEach((part) => {
        const sep = part.indexOf('::');
        if (sep > 0) tagAttrs[part.slice(0, sep)] = part.slice(sep + 2);
      });
      if (Object.keys(tagAttrs).length === 0) continue;
      const allMatch = Object.entries(tagAttrs).every(([attr, val]) => selectedAttributes[attr] === val);
      if (allMatch) {
        setSelectedImageIndex(i);
        return;
      }
    }
  }, [selectedAttributes, product?.imageVariantTags, product?.image, product?.galleryImages]);

  useEffect(() => {
    if (stockInfo.available == null) return;
    setQuantity((current) => (current === '' ? current : normalizeQuantity(current)));
    // normalizeQuantity depends on stockInfo.available and is declared below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockInfo.available]);

  useEffect(() => {
    if (!product?.id) return;
    recordProductView(product.id);
  }, [product?.id]);

  if (!product && resolvedProductId !== id) {
    return (
      <div className="shell flex min-h-[50vh] flex-col items-center justify-center py-16" role="status" aria-live="polite">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-slate-600">Loading product details...</p>
      </div>
    );
  }

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

  const gallery =
    product.galleryImages?.length > 0
      ? [product.image, ...product.galleryImages].filter(Boolean)
      : [product.image, product.image, product.image, product.image].filter(Boolean);
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
      logo: new URL('/elmshelf-logo.png', window.location.origin).toString(),
    },
    offers: productType === PRODUCT_TYPES.CUSTOM
      ? {
          '@type': 'Offer',
          priceCurrency: 'GBP',
          availability: stockInfo.isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          url: window.location.href,
        }
      : {
          '@type': 'Offer',
          priceCurrency: 'GBP',
          price: String(priceDisplay.numericPrice ?? product.salePrice ?? product.price ?? ''),
          availability: stockInfo.isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          url: window.location.href,
        },
  };
  const productUrl = window.location.href;
  const shareTitle = productType === PRODUCT_TYPES.CUSTOM
    ? product.name
    : `${product.name} - ${selectedPriceText} Exc. VAT`;
  const shareMessage = `${shareTitle}\n${productUrl}`;

  const fallbackCopyShareLink = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    const didCopy = document.execCommand('copy');
    document.body.removeChild(textArea);
    return didCopy;
  };

  const handleCopyShareLink = async () => {
    setShareFeedback('');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(productUrl);
      } else if (!fallbackCopyShareLink(productUrl)) {
        throw new Error('Copy command was not available.');
      }
      setShareFeedback('Link copied');
      setIsShareMenuOpen(false);
    } catch (err) {
      setShareFeedback('Could not copy link');
    }
  };

  const openShareWindow = (url) => {
    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (openedWindow) openedWindow.opener = null;
    setIsShareMenuOpen(false);
  };

  const shareOptions = [
    {
      label: 'WhatsApp',
      action: () => openShareWindow(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`),
      markerClass: 'bg-emerald-500',
    },
    {
      label: 'Facebook',
      action: () => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`),
      markerClass: 'bg-blue-600',
    },
    {
      label: 'X',
      action: () => openShareWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(productUrl)}`),
      markerClass: 'bg-slate-900',
    },
    {
      label: 'Email',
      action: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(shareMessage)}`;
        setIsShareMenuOpen(false);
      },
      markerClass: 'bg-amber-500',
    },
  ];

  const addSelectedProductToCart = async () => {
    setCartError('');
    if (stockInfo.isOutOfStock) {
      throw new Error('This product is currently out of stock.');
    }
    const normalizedQuantity = normalizeQuantity(quantity);
    setQuantity(normalizedQuantity);
    await addToCart(product, {
      attributes: selectedAttributes,
      quantity: normalizedQuantity,
      unitPrice: selectedVariantPrice,
    });
  };

  const handleAddToCart = async (event) => {
    event.preventDefault();
    try {
      await addSelectedProductToCart();
    } catch (err) {
      setCartError(err.message || 'Could not add to cart. Please try again.');
    }
  };

  const handleCheckout = async () => {
    try {
      await addSelectedProductToCart();
      navigate('/checkout');
    } catch (err) {
      setCartError(err.message || 'Could not start checkout. Please try again.');
    }
  };

  const normalizeQuantity = (next) => {
    const parsed = Number(next);
    if (!Number.isFinite(parsed)) return 1;
    const maxQuantity = stockInfo.available == null ? Number.MAX_SAFE_INTEGER : Math.max(1, stockInfo.available);
    return Math.min(maxQuantity, Math.max(1, Math.floor(parsed)));
  };

  const handleQuantityChange = (event) => {
    const nextValue = event.target.value;
    if (nextValue === '') {
      setQuantity('');
      return;
    }

    setQuantity(normalizeQuantity(nextValue));
  };

  const handleQuantityBlur = () => {
    setQuantity((current) => normalizeQuantity(current));
  };

  const handleImageMouseMove = (event) => {
    if (!isHoverZoomed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  };

  const scrollRelatedProducts = (direction) => {
    const container = relatedProductsRef.current;
    if (!container) return;

    if (direction > 0 && visibleRelatedCount < relatedProducts.length) {
      setVisibleRelatedCount((currentCount) => Math.min(currentCount + 4, relatedProducts.length));
      setCanScrollRelatedLeft(true);
      window.requestAnimationFrame(() => {
        container.scrollBy({ left: Math.max(container.clientWidth * 0.8, 260), behavior: 'smooth' });
      });
      return;
    }

    container.scrollBy({ left: direction * Math.max(container.clientWidth * 0.8, 260), behavior: 'smooth' });
  };

  const handleRelatedProductsScroll = (event) => {
    setCanScrollRelatedLeft(event.currentTarget.scrollLeft > 4);
  };

  const visibleRelatedProducts = relatedProducts.slice(0, visibleRelatedCount);

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
        <div className="shell px-2 sm:px-4">
          <BackButton className="mb-4" />
        </div>
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
            <p className={`mt-4 flex flex-wrap items-baseline gap-2 tracking-tight ${productType === PRODUCT_TYPES.CUSTOM ? 'text-slate-600' : 'text-slate-900'}`}>
              <span className="text-3xl">{selectedPriceText}</span>
              {productType !== PRODUCT_TYPES.CUSTOM && (
                <span className="text-sm font-semibold uppercase tracking-normal text-slate-500">Exc. VAT</span>
              )}
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

            {productType !== PRODUCT_TYPES.CUSTOM && (
              <div className={`mt-5 rounded-xl border px-4 py-3 ${
                stockInfo.isOutOfStock
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : stockInfo.isLowStock
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}>
                <p className="text-sm font-bold">
                  {stockInfo.isOutOfStock ? 'Out of stock' : stockInfo.isLowStock ? 'Low stock' : 'In stock'}
                </p>
                <p className="mt-1 text-sm">
                  {stockInfo.isOutOfStock
                    ? 'This item is currently unavailable.'
                    : `${stockInfo.available} available for order.`}
                </p>
              </div>
            )}

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
                      disabled={stockInfo.isOutOfStock}
                      className="px-3 py-2 text-slate-700"
                      type="button"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={stockInfo.available == null ? undefined : Math.max(1, stockInfo.available)}
                      value={quantity}
                      onChange={handleQuantityChange}
                      onBlur={handleQuantityBlur}
                      disabled={stockInfo.isOutOfStock}
                      className="w-24 border-x border-slate-300 px-2 py-2 text-center focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <button
                      onClick={() => setQuantity((prev) => normalizeQuantity(prev + 1))}
                      disabled={stockInfo.isOutOfStock || (stockInfo.available != null && normalizeQuantity(quantity) >= stockInfo.available)}
                      className="px-3 py-2 text-slate-700 disabled:text-slate-300"
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
                    disabled={stockInfo.isOutOfStock}
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-primary px-8 py-3 text-base font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {stockInfo.isOutOfStock ? 'Out of stock' : 'Add to cart'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={stockInfo.isOutOfStock}
                    className="flex w-full items-center justify-center rounded-md border border-green-700 bg-green-600 px-8 py-3 text-base font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                  >
                    Checkout
                  </button>
                </div>
              )}
              {cartError && (
                <p className="mt-3 text-sm font-medium text-red-600">{cartError}</p>
              )}
            </form>

            <div ref={shareMenuRef} className="relative mt-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShareFeedback('');
                    setIsShareMenuOpen((isOpen) => !isOpen);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-primary hover:bg-red-50 hover:text-primary"
                  aria-expanded={isShareMenuOpen}
                  aria-haspopup="menu"
                >
                  <UiIcon name="share" className="h-4 w-4" />
                  Share
                </button>
                {shareFeedback && (
                  <p className={`text-sm font-medium ${shareFeedback.includes('copied') ? 'text-emerald-700' : 'text-red-600'}`} aria-live="polite">
                    {shareFeedback}
                  </p>
                )}
              </div>

              {isShareMenuOpen && (
                <div
                  role="menu"
                  className="absolute left-0 z-20 mt-2 w-full max-w-sm rounded-lg border border-slate-200 bg-white p-2 shadow-lg sm:w-80"
                >
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <UiIcon name="copy" className="h-4 w-4 text-slate-500" />
                    Copy link
                  </button>
                  {shareOptions.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={option.action}
                      role="menuitem"
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      {option.label === 'Email' ? (
                        <UiIcon name="mail" className="h-4 w-4 text-slate-500" />
                      ) : (
                        <span className={`h-3 w-3 rounded-full ${option.markerClass}`} aria-hidden="true" />
                      )}
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {product.mainNote && (
              <div className="mt-10">
                <div
                  className="tiptap-render text-base text-slate-900"
                  dangerouslySetInnerHTML={{ __html: product.mainNote }}
                />
              </div>
            )}

            {product.description && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-900 mb-2">Description</h3>
                <div
                  className="tiptap-render text-base text-slate-700"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

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

        {(product.keyFeatures || product.whatsIncluded || product.importantNotes || product.additionalInformation) && (
          <div className="shell mx-auto mt-12 max-w-7xl px-2 sm:px-4 space-y-8">
            {product.keyFeatures && (
              <div className="border-t border-slate-200 pt-8 text-left">
                <h3 className="mb-4 text-sm font-medium text-slate-900">Key Features</h3>
                <div
                  className="tiptap-render text-sm text-slate-700"
                  dangerouslySetInnerHTML={{ __html: product.keyFeatures }}
                />
              </div>
            )}
            {product.whatsIncluded && (
              <div className="border-t border-slate-200 pt-8 text-left">
                <h3 className="mb-4 text-sm font-medium text-slate-900">What's Included</h3>
                <div
                  className="tiptap-render text-sm text-slate-700"
                  dangerouslySetInnerHTML={{ __html: product.whatsIncluded }}
                />
              </div>
            )}
            {product.importantNotes && (
              <div className="border-t border-slate-200 pt-8 text-left">
                <h3 className="mb-4 text-sm font-medium text-slate-900">Important Notes</h3>
                <div
                  className="tiptap-render text-sm text-slate-700"
                  dangerouslySetInnerHTML={{ __html: product.importantNotes }}
                />
              </div>
            )}
            {product.additionalInformation && (
              <div className="border-t border-slate-200 pt-8 text-left">
                <h3 className="mb-4 text-sm font-medium text-slate-900">Additional Information</h3>
                <div
                  className="tiptap-render text-sm text-slate-700"
                  dangerouslySetInnerHTML={{ __html: product.additionalInformation }}
                />
              </div>
            )}
          </div>
        )}

        {relatedProducts.length > 0 && (
          <section className="shell mx-auto mt-12 max-w-7xl px-2 sm:px-4" aria-labelledby="related-products-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-t border-slate-200 pt-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">More to explore</p>
                <h2 id="related-products-heading" className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                  Related Products
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  More products from the same category, with available items shown first.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {product.categories?.[0] && (
                  <Link
                    to={categoryPath(product.categories[0])}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-primary transition hover:bg-red-50"
                  >
                    View all
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => scrollRelatedProducts(-1)}
                  disabled={!canScrollRelatedLeft}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-primary hover:bg-red-50 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
                  aria-label="Show previous related products"
                >
                  <span aria-hidden="true">←</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollRelatedProducts(1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-primary hover:bg-red-50 hover:text-primary"
                  aria-label="Show more related products"
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
            <div
              ref={relatedProductsRef}
              onScroll={handleRelatedProductsScroll}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:thin]"
            >
              {visibleRelatedProducts.map((relatedProduct) => (
                <div key={relatedProduct.id} className="w-[210px] shrink-0 snap-start sm:w-[240px]">
                  <ProductCard product={relatedProduct} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ProductDetail;
