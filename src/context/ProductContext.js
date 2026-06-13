import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import initialProducts from '../data/products';
import { normalizeProductContent } from '../utils/productContent';

const ProductContext = createContext();
const API_BASE_URL = process.env.REACT_APP_API_URL;
const API_ORIGIN = API_BASE_URL ? new URL(API_BASE_URL).origin : '';
const AUTH_EXPIRED_EVENT = 'app:auth-expired';

const initialCategories = [
  {
    name: 'Shop Shelving',
    image: '/wall-bays.jpg',
    subcategories: [
      { name: 'Wall Bays', image: '/wall-bays.jpg' },
      { name: 'Gondola Shelving', image: '/wall-bays.jpg' },
      { name: 'Modular Shelving', image: '/modular-shelf.jpg' },
      { name: 'Bakery Racks', image: '/wall-bays.jpg' },
    ],
  },
  {
    name: 'Shop Counters',
    image: '/store-counter.jpg',
    subcategories: [
      { name: 'Glass Counters', image: '/glass-counter.jpg' },
      { name: 'Checkout Counters', image: '/store-counter.jpg' },
      { name: 'Till Counters', image: '/store-counter.jpg' },
    ],
  },
  {
    name: 'Refrigeration',
    image: '/chiller.jpg',
    subcategories: [
      { name: 'Display Chillers', image: '/chiller.jpg' },
    ],
  },
  { name: 'Fruit & Veg Shelving', image: '/wall-bays.jpg', subcategories: [] },
  { name: 'Retail Shop Displays', image: '/glass-counter.jpg', subcategories: [] },
  { name: 'Bakery & Bread Shelving', image: '/wall-bays.jpg', subcategories: [] },
  { name: 'Slatwall Panels', image: '/wall-bays.jpg', subcategories: [] },
  { name: 'Wall Panels', image: '/wall-bays.jpg', subcategories: [] },
  { name: 'Grid Ceilings', image: '/store-counter.jpg', subcategories: [] },
  {
    name: 'Flooring',
    image: '/flooring.jpg',
    subcategories: [{ name: 'Vinyl Flooring', image: '/flooring.jpg' }],
  },
  { name: 'Shop Led Lights', image: '/glass-counter.jpg', subcategories: [] },
  { name: 'Tobacco & Vape Displays', image: '/glass-counter.jpg', subcategories: [] },
  { name: 'Baskets & Trolleys', image: '/store-counter.jpg', subcategories: [] },
  { name: 'Point Of Sale', image: '/store-counter.jpg', subcategories: [] },
  { name: 'Acrylic & Wire', image: '/modular-shelf.jpg', subcategories: [] },
  { name: 'Pick N Mix Displays', image: '/glass-counter.jpg', subcategories: [] },
  { name: 'AMX Shelving', image: '/wall-bays.jpg', subcategories: [] },
  { name: 'Clothing Display', image: '/modular-shelf.jpg', subcategories: [] },
  { name: 'Crisp & Snack Displays', image: '/glass-counter.jpg', subcategories: [] },
  { name: 'DIY & Tool Display', image: '/modular-shelf.jpg', subcategories: [] },
  { name: 'Epos Ticket Strips', image: '/store-counter.jpg', subcategories: [] },
  { name: 'Flower Display', image: '/glass-counter.jpg', subcategories: [] },
  { name: 'Risers & Dividers', image: '/modular-shelf.jpg', subcategories: [] },
  { name: 'Hooks', image: '/wall-bays.jpg', subcategories: [] },
  { name: 'Wine Display', image: '/glass-counter.jpg', subcategories: [] },
  { name: 'Security Products', image: '/store-counter.jpg', subcategories: [] },
  { name: 'Wire Dump Bins', image: '/modular-shelf.jpg', subcategories: [] },
  { name: 'News & Mags', image: '/store-counter.jpg', subcategories: [] },
  { name: 'Price Gun & Pricing', image: '/store-counter.jpg', subcategories: [] },
  { name: 'Displays & Accessories', image: '/glass-counter.jpg', subcategories: [] },
];

const getNowIso = () => new Date().toISOString();

const hasValidNumericId = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

const createDefaultInventory = (product) => {
  const base = (Number(product.id) || 1) * 7;
  const onHand = 40 + (base % 120);
  const reserved = base % 9;
  const reorderLevel = 18 + (base % 20);
  const reorderQty = 40 + (base % 60);
  const openingTimestamp = getNowIso();

  return {
    sku: hasValidNumericId(product.id) ? `ELM-${String(product.id).padStart(4, '0')}` : '',
    onHand,
    reserved,
    reorderLevel,
    reorderQty,
    averageDailyUsage: 2 + (base % 6),
    location: `Aisle-${(base % 8) + 1}`,
    supplier: 'Default Supplier',
    leadTimeDays: 5 + (base % 5),
    lastAuditAt: openingTimestamp,
    lastUpdatedAt: openingTimestamp,
    movements: [
      {
        id: `${product.id}-init`,
        type: 'INIT',
        quantity: onHand,
        previousOnHand: 0,
        newOnHand: onHand,
        reason: 'Opening stock',
        actor: 'System',
        at: openingTimestamp,
      },
    ],
  };
};

const sanitizeInventorySku = (value) => {
  const trimmed = `${value || ''}`.trim();
  if (!trimmed) return null;
  if (/undefined|null/i.test(trimmed)) return null;
  return trimmed;
};

const normalizeInventory = (product) => {
  const defaults = createDefaultInventory(product);
  const existing = product.inventory || {};
  const onHand = Number(existing.onHand ?? defaults.onHand);
  const reserved = Math.min(Number(existing.reserved ?? defaults.reserved), Math.max(onHand, 0));

  return {
    ...defaults,
    ...existing,
    onHand: Math.max(onHand, 0),
    reserved: Math.max(reserved, 0),
    reorderLevel: Math.max(Number(existing.reorderLevel ?? defaults.reorderLevel), 0),
    reorderQty: Math.max(Number(existing.reorderQty ?? defaults.reorderQty), 1),
    averageDailyUsage: Math.max(Number(existing.averageDailyUsage ?? defaults.averageDailyUsage), 0.1),
    leadTimeDays: Math.max(Number(existing.leadTimeDays ?? defaults.leadTimeDays), 1),
    movements: Array.isArray(existing.movements) && existing.movements.length > 0 ? existing.movements : defaults.movements,
    lastUpdatedAt: existing.lastUpdatedAt || defaults.lastUpdatedAt,
    lastAuditAt: existing.lastAuditAt || defaults.lastAuditAt,
  };
};

const resolveMediaUrl = (value) => {
  if (!value) return '';
  if (/^(data:|blob:|https?:)/i.test(value)) return value;
  if (!API_ORIGIN) return value;
  if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
};

const mapCategoryFromApi = (category = {}) => ({
  id: category.id,
  name: category.name || '',
  image: resolveMediaUrl(category.image_url),
  subcategories: Array.isArray(category.children)
    ? category.children.map((child) => ({
        id: child.id,
        name: child.name || '',
        image: resolveMediaUrl(child.image_url || category.image_url || ''),
      }))
    : [],
});

const parseVariantAttributes = (groupAttribute = '', value = '', skuSuffix = '') => {
  if (groupAttribute !== 'Combination' || !skuSuffix) return null;

  try {
    const parsed = JSON.parse(skuSuffix);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    return null;
  }
};

const mapVariantPricingFromApi = (variantGroups = [], basePrice = 0) =>
  (variantGroups || []).flatMap((group) =>
    (group.variants || []).map((variant) => {
      const attributes = parseVariantAttributes(group.attribute, variant.value, variant.sku_suffix);
      return {
        attribute: attributes ? '' : group.attribute || '',
        value: attributes ? '' : variant.value || '',
        attributes: attributes || undefined,
        price: Number(basePrice || 0) + Number(variant.price_modifier || 0),
        stock: Number(variant.stock_quantity || 0),
        sku: attributes ? '' : variant.sku_suffix || '',
      };
    })
  );

const deriveVariantPriceRange = (variantPricing = []) => {
  const prices = (variantPricing || [])
    .map((row) => Number(row.price))
    .filter((price) => Number.isFinite(price));

  if (prices.length === 0) {
    return { minPrice: undefined, maxPrice: undefined };
  }

  return {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };
};

const deriveVariantValues = (variantPricing = [], attributeNames = []) => {
  const allowed = attributeNames.map((name) => name.toLowerCase());
  return [
    ...new Set(
      (variantPricing || [])
        .flatMap((row) => {
          const attributes = row.attributes && typeof row.attributes === 'object' ? row.attributes : null;
          if (attributes) {
            return Object.entries(attributes)
              .filter(([attribute]) => allowed.includes((attribute || '').toLowerCase()))
              .map(([, value]) => value);
          }

          if (allowed.includes((row.attribute || '').toLowerCase())) {
            return [row.value];
          }

          return [];
        })
        .filter(Boolean)
    ),
  ];
};

const mapProductFromApi = (product = {}) => {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const parentCategories = categories.filter((category) => category.parent_id == null);
  const childCategories = categories.filter((category) => category.parent_id != null);
  const images = Array.isArray(product.images) ? [...product.images].sort((a, b) => a.sort_order - b.sort_order) : [];
  const primaryImage = images.find((image) => image.is_primary) || images[0] || null;
  const galleryImages = images
    .filter((image) => !primaryImage || image.id !== primaryImage.id)
    .map((image) => resolveMediaUrl(image.image_url));
  const variantPricing = mapVariantPricingFromApi(product.variant_groups, product.price);
  const { minPrice, maxPrice } = deriveVariantPriceRange(variantPricing);

  return {
    id: product.id,
    name: product.name || '',
    description: product.description || '',
    price: Number(product.price || 0),
    salePrice: product.sale_price != null ? Number(product.sale_price) : '',
    productType: product.product_type || 'simple',
    categories: parentCategories.map((category) => category.name),
    subcategories: childCategories.map((category) => category.name),
    industries: product.industries || [],
    image: resolveMediaUrl(primaryImage?.image_url || ''),
    galleryImages,
    imageCount: images.length,
    variantPricing,
    minPrice,
    maxPrice,
    sizes: deriveVariantValues(variantPricing, ['size']),
    colors: deriveVariantValues(variantPricing, ['color', 'colour']),
    variantImages: Array.isArray(product.variant_images) ? product.variant_images : [],
    additionalInformation: normalizeProductContent(product.additional_information),
    inventory: {
      onHand: Number(product.stock_quantity || 0),
    },
    _apiImages: images,
  };
};

const mergeProductMediaIntoApiShape = (product = {}, media = {}) => ({
  ...product,
  images: Array.isArray(media.images) ? media.images : product.images || [],
});

const buildOptimisticMediaShape = (media = {}) => ({
  images: [media.image, ...(media.galleryImages || [])]
    .filter(Boolean)
    .map((imageUrl, index) => ({
      id: `temp-image-${index}`,
      image_url: imageUrl,
      is_primary: index === 0,
      sort_order: index,
    })),
});

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

const getCookieValue = (name) => {
  if (typeof document === 'undefined') return '';

  const prefix = `${name}=`;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  if (!match) return '';

  return decodeURIComponent(match.slice(prefix.length));
};

const createAuthHeaders = () => {
  const csrfToken = getCookieValue(CSRF_COOKIE_NAME);
  return csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {};
};

const handleProtectedApiResponse = async (response, fallbackMessage) => {
  if (response.ok) return null;

  const errorData = await response.json().catch(() => null);
  const detail = errorData?.detail || fallbackMessage;
  const isAuthError = response.status === 401 || response.status === 403;
  const invalidCredentials = typeof detail === 'string' && detail.toLowerCase().includes('validate credentials');

  if (isAuthError || invalidCredentials) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    throw new Error('Your admin session expired. Please sign in again and retry.');
  }

  throw new Error(detail || fallbackMessage);
};

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const performRequest = async (url, options = {}, fallbackMessage = 'Request failed') => {
  const attempt = async () => {
    try {
      return await fetch(url, { credentials: 'include', ...options });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message && /load failed|failed to fetch|networkerror/i.test(message)) {
        throw new Error(`${fallbackMessage}. Please make sure the backend is running and try again.`);
      }
      throw error;
    }
  };

  try {
    return await attempt();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/backend is running and try again/i.test(message)) {
      await delay(300);
      return attempt();
    }
    throw error;
  }
};

const dataUrlToFile = async (dataUrl, filename) => {
  if (!dataUrl) {
    throw new Error('Missing media data');
  }

  if (!dataUrl.startsWith('data:')) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const extension = blob.type.split('/')[1] || 'png';
    return new File([blob], `${filename}.${extension}`, { type: blob.type || 'image/png' });
  }

  const [meta, content] = dataUrl.split(',', 2);
  if (!meta || !content) {
    throw new Error('Invalid uploaded media');
  }

  const mimeMatch = meta.match(/^data:([^;]+)(;base64)?$/i);
  const mimeType = mimeMatch?.[1] || 'application/octet-stream';
  const isBase64 = /;base64$/i.test(meta);

  let byteString;
  if (isBase64) {
    byteString = atob(content);
  } else {
    byteString = decodeURIComponent(content);
  }

  const bytes = new Uint8Array(byteString.length);
  for (let index = 0; index < byteString.length; index += 1) {
    bytes[index] = byteString.charCodeAt(index);
  }

  const extension = mimeType.split('/')[1] || 'bin';
  return new File([bytes], `${filename}.${extension}`, { type: mimeType });
};

const getLocalFallbackProducts = () =>
  initialProducts.map((product) => ({
    ...product,
    additionalInformation: normalizeProductContent(product.additionalInformation),
    inventory: normalizeInventory(product),
  }));

export function ProductProvider({ children }) {
  const [products, setProducts] = useState(() => (API_BASE_URL ? [] : getLocalFallbackProducts()));
  const [categories, setCategories] = useState(initialCategories);

  const refreshCategoriesFromApi = useCallback(async () => {
    if (!API_BASE_URL) return null;

    const response = await performRequest(`${API_BASE_URL}/categories/`, {}, 'Unable to load categories');
    if (!response.ok) {
      throw new Error('Failed to load categories');
    }

    const data = await response.json();
    const normalized = Array.isArray(data) ? data.map(mapCategoryFromApi) : [];
    setCategories(normalized);
    return normalized;
  }, []);

  useEffect(() => {
    if (!API_BASE_URL) return;

    let isMounted = true;

    const loadCategories = async () => {
      try {
        const response = await performRequest(`${API_BASE_URL}/categories/`, {}, 'Unable to load categories');
        if (!response.ok) {
          throw new Error('Failed to load categories');
        }

        const data = await response.json();
        if (!isMounted) return;
        setCategories(Array.isArray(data) ? data.map(mapCategoryFromApi) : []);
      } catch (error) {
        console.error('Unable to load backend categories:', error);
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!API_BASE_URL) {
      setProducts(getLocalFallbackProducts());
      return;
    }

    let isMounted = true;

    const loadProducts = async () => {
      try {
        const response = await performRequest(`${API_BASE_URL}/products/?per_page=100`, {}, 'Unable to load products');
        if (!response.ok) {
          throw new Error('Failed to load products');
        }

        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!isMounted) return;
        setProducts(items.map(mapProductFromApi));
      } catch (error) {
        console.error('Unable to load backend products:', error);
        if (!isMounted) return;
        setProducts([]);
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  const getCategoryIdsByNames = useCallback((categoryNamesToMatch = [], subcategoryNamesToMatch = []) => {
    const parentIds = categories
      .filter((category) => categoryNamesToMatch.includes(category.name))
      .map((category) => category.id);
    const childIds = categories
      .flatMap((category) => category.subcategories || [])
      .filter((subcategory) => subcategoryNamesToMatch.includes(subcategory.name))
      .map((subcategory) => subcategory.id);

    return [...new Set([...parentIds, ...childIds])];
  }, [categories]);

  const buildVariantGroupsPayload = useCallback((basePrice = 0, variantPricing = []) => {
    const grouped = (variantPricing || []).reduce((acc, row) => {
      const attributes = row.attributes && typeof row.attributes === 'object' ? row.attributes : null;
      if (attributes && Object.keys(attributes).length > 0) {
        const attribute = 'Combination';
        const value = Object.values(attributes).join(' / ');
        if (!acc[attribute]) acc[attribute] = [];
        acc[attribute].push({
          value,
          price_modifier: Number(row.price || basePrice || 0) - Number(basePrice || 0),
          stock_quantity: Number(row.stock || 0),
          sku_suffix: JSON.stringify(attributes),
        });
        return acc;
      }

      const attribute = (row.attribute || '').trim();
      const value = (row.value || '').trim();
      if (!attribute || !value) return acc;
      if (!acc[attribute]) acc[attribute] = [];
      acc[attribute].push({
        value,
        price_modifier: Number(row.price || basePrice || 0) - Number(basePrice || 0),
        stock_quantity: Number(row.stock || 0),
        sku_suffix: row.sku || null,
      });
      return acc;
    }, {});

    return Object.entries(grouped).map(([attribute, variants]) => ({
      attribute,
      variants,
    }));
  }, []);

  const syncProductMedia = useCallback(async (productId, productName, media = {}, existingProduct = null) => {
    const imageUrls = [media.image, ...(media.galleryImages || [])].filter(Boolean);
    const existingImages = existingProduct?._apiImages || [];
    let nextImages = existingImages;

    const sameImages =
      existingImages.length === imageUrls.length &&
      [resolveMediaUrl(existingImages.find((image) => image.is_primary)?.image_url || existingImages[0]?.image_url || ''), ...existingImages
        .filter((image) => !existingImages.find((item) => item.is_primary)?.id || image.id !== existingImages.find((item) => item.is_primary)?.id)
        .map((image) => resolveMediaUrl(image.image_url))]
        .filter(Boolean)
        .every((url, index) => url === imageUrls[index]);

    if (!sameImages) {
      for (const image of existingImages) {
        const deleteResponse = await performRequest(`${API_BASE_URL}/products/${productId}/images/${image.id}`, {
          method: 'DELETE',
          headers: createAuthHeaders(),
        }, 'Failed to delete existing product image');
        await handleProtectedApiResponse(deleteResponse, 'Failed to delete existing product image');
      }

      nextImages = [];
      for (const [index, imageUrl] of imageUrls.entries()) {
        const file = await dataUrlToFile(imageUrl, `${productName || 'product'}-image-${index + 1}`);
        const formData = new FormData();
        formData.append('file', file);
        const uploadResponse = await performRequest(`${API_BASE_URL}/products/${productId}/images?is_primary=${index === 0}`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: formData,
        }, `Failed to upload product image ${index + 1}`);
        await handleProtectedApiResponse(uploadResponse, 'Failed to upload product image');
        nextImages.push(await uploadResponse.json());
      }
    }

    return {
      images: nextImages,
    };
  }, []);

  const addProduct = useCallback(async (newProduct) => {
    const productWithId = {
      ...newProduct,
      additionalInformation: normalizeProductContent(newProduct.additionalInformation),
      inventory: normalizeInventory(newProduct),
    };

    if (!API_BASE_URL) {
      const nextId = Math.max(...products.map((p) => p.id), 0) + 1;
      const localProduct = { ...productWithId, id: nextId };
      setProducts((prev) => [...prev, localProduct]);
      return localProduct;
    }

    const payload = {
      name: productWithId.name,
      description: productWithId.description || '',
      additional_information: productWithId.additionalInformation,
      price: Number(productWithId.price || 0),
      sale_price: productWithId.salePrice === '' ? null : (productWithId.salePrice != null ? Number(productWithId.salePrice) : null),
      stock_quantity: Number(productWithId.inventory?.onHand || 0),
      sku: sanitizeInventorySku(productWithId.inventory?.sku),
      industries: productWithId.industries || [],
      variant_images: productWithId.variantImages || [],
      category_ids: getCategoryIdsByNames(productWithId.categories || [], productWithId.subcategories || []),
      variant_groups: buildVariantGroupsPayload(productWithId.price, productWithId.variantPricing),
    };

    const createResponse = await performRequest(`${API_BASE_URL}/products/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthHeaders(),
      },
      body: JSON.stringify(payload),
    }, 'Failed to create product in the backend');

    await handleProtectedApiResponse(createResponse, 'Failed to create product in the backend');
    const createdProduct = await createResponse.json();
    const optimisticProduct = mapProductFromApi(
      mergeProductMediaIntoApiShape(createdProduct, buildOptimisticMediaShape(productWithId))
    );

    setProducts((prev) => [...prev, optimisticProduct]);

    void syncProductMedia(createdProduct.id, createdProduct.name, productWithId)
      .then((syncedMedia) => {
        const normalizedProduct = mapProductFromApi(mergeProductMediaIntoApiShape(createdProduct, syncedMedia));
        setProducts((prev) => prev.map((product) => (product.id !== createdProduct.id ? product : normalizedProduct)));
      })
      .catch((error) => {
        console.error('Background product media sync failed:', error);
      });

    return optimisticProduct;
  }, [buildVariantGroupsPayload, getCategoryIdsByNames, products, syncProductMedia]);

  const updateProduct = useCallback(async (productId, updatedData) => {
    const existingProduct = products.find((product) => product.id === productId);
    if (!existingProduct) return false;

    const merged = {
      ...existingProduct,
      ...updatedData,
    };
    merged.additionalInformation = normalizeProductContent(merged.additionalInformation);
    merged.inventory = normalizeInventory({
      ...existingProduct,
      inventory: {
        ...existingProduct.inventory,
        ...(updatedData.inventory || {}),
      },
    });

    if (!API_BASE_URL) {
      setProducts((prev) =>
        prev.map((p) => (p.id !== productId ? p : merged))
      );
      return merged;
    }

    const payload = {
      name: merged.name,
      description: merged.description || '',
      additional_information: merged.additionalInformation,
      price: Number(merged.price || 0),
      sale_price: merged.salePrice === '' ? null : (merged.salePrice != null ? Number(merged.salePrice) : null),
      stock_quantity: Number(merged.inventory?.onHand || 0),
      sku: sanitizeInventorySku(merged.inventory?.sku),
      industries: merged.industries || [],
      variant_images: merged.variantImages || [],
      category_ids: getCategoryIdsByNames(merged.categories || [], merged.subcategories || []),
      variant_groups: buildVariantGroupsPayload(merged.price, merged.variantPricing),
    };

    const updateResponse = await performRequest(`${API_BASE_URL}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthHeaders(),
      },
      body: JSON.stringify(payload),
    }, 'Failed to update product in the backend');

    await handleProtectedApiResponse(updateResponse, 'Failed to update product in the backend');
    const updatedProduct = await updateResponse.json();
    const optimisticProduct = mapProductFromApi(
      mergeProductMediaIntoApiShape(updatedProduct, buildOptimisticMediaShape(merged))
    );

    setProducts((prev) => prev.map((product) => (product.id !== productId ? product : optimisticProduct)));

    void syncProductMedia(updatedProduct.id, updatedProduct.name, merged, existingProduct)
      .then((syncedMedia) => {
        const normalizedProduct = mapProductFromApi(mergeProductMediaIntoApiShape(updatedProduct, syncedMedia));
        setProducts((prev) => prev.map((product) => (product.id !== productId ? product : normalizedProduct)));
      })
      .catch((error) => {
        console.error('Background product media sync failed:', error);
      });

    return optimisticProduct;
  }, [buildVariantGroupsPayload, getCategoryIdsByNames, products, syncProductMedia]);

  const deleteProduct = useCallback(async (productId) => {
    if (API_BASE_URL) {
      const deleteResponse = await performRequest(`${API_BASE_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          ...createAuthHeaders(),
        },
      }, 'Failed to delete product in the backend');
      await handleProtectedApiResponse(deleteResponse, 'Failed to delete product in the backend');
    }

    setProducts((prev) => prev.filter((p) => p.id !== productId));
    return true;
  }, []);

  const getProductById = useCallback(
    (id) => products.find((p) => p.id === parseInt(id, 10)),
    [products]
  );

  const getProductsByCategory = useCallback(
    (category) => products.filter((p) => p.categories.includes(category)),
    [products]
  );

  const addCategory = useCallback(async (categoryData) => {
    const payload =
      typeof categoryData === 'string'
        ? { name: categoryData.trim(), image: '', subcategories: [] }
        : { name: categoryData.name?.trim() || '', image: categoryData.image?.trim() || '', subcategories: categoryData.subcategories || [] };

    if (!payload.name) return false;

    const exists = categories.some((c) => c.name.toLowerCase() === payload.name.toLowerCase());
    if (exists) return false;

    if (!API_BASE_URL) {
      setCategories((prev) => [...prev, payload]);
      return payload;
    }

    const imageIsDataUrl = payload.image.startsWith('data:');
    const createResponse = await fetch(`${API_BASE_URL}/categories/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthHeaders(),
      },
      body: JSON.stringify({
        name: payload.name,
        image_url: imageIsDataUrl ? null : payload.image || null,
      }),
    });

    await handleProtectedApiResponse(createResponse, 'Failed to create category in the backend');

    const createdCategory = await createResponse.json();
    let imageUrl = createdCategory.image_url || payload.image || '';

    if (imageIsDataUrl) {
      const file = await dataUrlToFile(payload.image, createdCategory.slug || createdCategory.name || 'category');
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${API_BASE_URL}/categories/${createdCategory.id}/image`, {
        method: 'POST',
        credentials: 'include',
        headers: createAuthHeaders(),
        body: formData,
      });

      await handleProtectedApiResponse(uploadResponse, 'Category created but image upload failed');

      const uploadData = await uploadResponse.json();
      imageUrl = uploadData.image_url || imageUrl;
    }

    const refreshedCategories = await refreshCategoriesFromApi();
    return (
      refreshedCategories?.find((category) => category.id === createdCategory.id) ||
      mapCategoryFromApi({
        ...createdCategory,
        image_url: imageUrl,
        children: createdCategory.children || [],
      })
    );
  }, [categories, refreshCategoriesFromApi]);

  const deleteCategory = useCallback(async (categoryName) => {
    const existingCategory = categories.find((c) => c.name === categoryName);
    if (!existingCategory) return false;

    if (API_BASE_URL) {
      const deleteResponse = await fetch(`${API_BASE_URL}/categories/${existingCategory.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...createAuthHeaders(),
        },
      });

      await handleProtectedApiResponse(deleteResponse, 'Failed to delete category in the backend');
    }

    if (API_BASE_URL) {
      await refreshCategoriesFromApi();
    } else {
      setCategories((prev) => prev.filter((c) => c.name !== categoryName));
    }
    return true;
  }, [categories, refreshCategoriesFromApi]);

  const updateCategory = useCallback(async (oldName, updatedCategoryData) => {
    const payload =
      typeof updatedCategoryData === 'string'
        ? { name: updatedCategoryData.trim(), image: '' }
        : {
            name: updatedCategoryData.name?.trim() || oldName,
            image: updatedCategoryData.image?.trim() || '',
            subcategories: updatedCategoryData.subcategories || [],
          };

    const existingCategory = categories.find((c) => c.name === oldName);
    if (!existingCategory) return false;

    let nextCategory = {
      ...existingCategory,
      name: payload.name,
      image: payload.image || existingCategory.image,
      subcategories: payload.subcategories.length > 0 ? payload.subcategories : (existingCategory.subcategories || []),
    };

    if (API_BASE_URL) {
      const imageIsDataUrl = payload.image.startsWith('data:');
      const updateResponse = await fetch(`${API_BASE_URL}/categories/${existingCategory.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders(),
        },
        body: JSON.stringify({
          name: payload.name,
          image_url: imageIsDataUrl ? undefined : (payload.image || existingCategory.image || null),
        }),
      });

      await handleProtectedApiResponse(updateResponse, 'Failed to update category in the backend');

      const updatedCategory = await updateResponse.json();
      let imageUrl = updatedCategory.image_url || payload.image || existingCategory.image || '';

      if (imageIsDataUrl) {
        const file = await dataUrlToFile(payload.image, updatedCategory.slug || updatedCategory.name || 'category');
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(`${API_BASE_URL}/categories/${existingCategory.id}/image`, {
          method: 'POST',
          credentials: 'include',
          headers: createAuthHeaders(),
          body: formData,
        });

        await handleProtectedApiResponse(uploadResponse, 'Category updated but image upload failed');

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.image_url || imageUrl;
      }

      nextCategory = {
        ...mapCategoryFromApi({
          ...updatedCategory,
          image_url: imageUrl,
          children: updatedCategory.children || [],
        }),
        subcategories: payload.subcategories.length > 0
          ? payload.subcategories
          : mapCategoryFromApi({
              ...updatedCategory,
              image_url: imageUrl,
              children: updatedCategory.children || [],
            }).subcategories,
      };
    }

    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        categories: p.categories.map((c) => (c === oldName ? payload.name : c)),
      }))
    );

    if (API_BASE_URL) {
      const refreshedCategories = await refreshCategoriesFromApi();
      nextCategory =
        refreshedCategories?.find((category) => category.id === existingCategory.id || category.name === payload.name) ||
        nextCategory;
    } else {
      setCategories((prev) =>
        prev.map((c) =>
          c.name === oldName
            ? nextCategory
            : c
        )
      );
    }
    return nextCategory;
  }, [categories, refreshCategoriesFromApi]);

  const addSubcategory = useCallback(async (parentCategoryName, subcategoryData) => {
    const parentCategory = categories.find((c) => c.name === parentCategoryName);
    if (!parentCategory) return false;

    const payload =
      typeof subcategoryData === 'string'
        ? { name: subcategoryData.trim(), image: '' }
        : { name: subcategoryData.name?.trim() || '', image: subcategoryData.image?.trim() || '' };

    if (!payload.name) return false;

    const exists = (parentCategory.subcategories || []).some(
      (item) => item.name.toLowerCase() === payload.name.toLowerCase()
    );
    if (exists) return false;

    let nextSubcategory = {
      id: Date.now(),
      name: payload.name,
      image: payload.image,
    };

    if (API_BASE_URL) {
      const imageIsDataUrl = payload.image.startsWith('data:');
      const createResponse = await fetch(`${API_BASE_URL}/categories/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders(),
        },
        body: JSON.stringify({
          name: payload.name,
          parent_id: parentCategory.id,
          image_url: imageIsDataUrl ? null : (payload.image || null),
        }),
      });

      await handleProtectedApiResponse(createResponse, 'Failed to create subcategory in the backend');

      const createdSubcategory = await createResponse.json();
      let imageUrl = createdSubcategory.image_url || payload.image || '';

      if (imageIsDataUrl) {
        const file = await dataUrlToFile(payload.image, createdSubcategory.slug || createdSubcategory.name || 'subcategory');
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(`${API_BASE_URL}/categories/${createdSubcategory.id}/image`, {
          method: 'POST',
          credentials: 'include',
          headers: createAuthHeaders(),
          body: formData,
        });

        await handleProtectedApiResponse(uploadResponse, 'Subcategory created but image upload failed');

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.image_url || imageUrl;
      }

      nextSubcategory = {
        id: createdSubcategory.id,
        name: createdSubcategory.name || payload.name,
        image: resolveMediaUrl(imageUrl),
      };
    }

    if (API_BASE_URL) {
      await refreshCategoriesFromApi();
    } else {
      setCategories((prev) =>
        prev.map((category) =>
          category.name === parentCategoryName
            ? {
                ...category,
                subcategories: [...(category.subcategories || []), nextSubcategory],
              }
            : category
        )
      );
    }

    return nextSubcategory;
  }, [categories, refreshCategoriesFromApi]);

  const updateSubcategory = useCallback(async (parentCategoryName, oldSubcategoryName, subcategoryData) => {
    const parentCategory = categories.find((c) => c.name === parentCategoryName);
    const existingSubcategory = parentCategory?.subcategories?.find((item) => item.name === oldSubcategoryName);
    if (!parentCategory || !existingSubcategory) return false;

    const payload =
      typeof subcategoryData === 'string'
        ? { name: subcategoryData.trim(), image: '' }
        : { name: subcategoryData.name?.trim() || oldSubcategoryName, image: subcategoryData.image?.trim() || '' };

    let nextSubcategory = {
      ...existingSubcategory,
      name: payload.name,
      image: payload.image || existingSubcategory.image,
    };

    if (API_BASE_URL) {
      const imageIsDataUrl = payload.image.startsWith('data:');
      const updateResponse = await fetch(`${API_BASE_URL}/categories/${existingSubcategory.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders(),
        },
        body: JSON.stringify({
          name: payload.name,
          parent_id: parentCategory.id,
          image_url: imageIsDataUrl ? undefined : (payload.image || existingSubcategory.image || null),
        }),
      });

      await handleProtectedApiResponse(updateResponse, 'Failed to update subcategory in the backend');

      const updatedSubcategory = await updateResponse.json();
      let imageUrl = updatedSubcategory.image_url || payload.image || existingSubcategory.image || '';

      if (imageIsDataUrl) {
        const file = await dataUrlToFile(payload.image, updatedSubcategory.slug || updatedSubcategory.name || 'subcategory');
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(`${API_BASE_URL}/categories/${existingSubcategory.id}/image`, {
          method: 'POST',
          credentials: 'include',
          headers: createAuthHeaders(),
          body: formData,
        });

        await handleProtectedApiResponse(uploadResponse, 'Subcategory updated but image upload failed');

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.image_url || imageUrl;
      }

      nextSubcategory = {
        id: updatedSubcategory.id,
        name: updatedSubcategory.name || payload.name,
        image: resolveMediaUrl(imageUrl),
      };
    }

    setProducts((prev) =>
      prev.map((product) => ({
        ...product,
        subcategories: (product.subcategories || []).map((name) =>
          name === oldSubcategoryName ? payload.name : name
        ),
      }))
    );

    if (API_BASE_URL) {
      await refreshCategoriesFromApi();
    } else {
      setCategories((prev) =>
        prev.map((category) =>
          category.name === parentCategoryName
            ? {
                ...category,
                subcategories: (category.subcategories || []).map((item) =>
                  item.name === oldSubcategoryName ? nextSubcategory : item
                ),
              }
            : category
        )
      );
    }

    return nextSubcategory;
  }, [categories, refreshCategoriesFromApi]);

  const deleteSubcategory = useCallback(async (parentCategoryName, subcategoryName) => {
    const parentCategory = categories.find((c) => c.name === parentCategoryName);
    const existingSubcategory = parentCategory?.subcategories?.find((item) => item.name === subcategoryName);
    if (!parentCategory || !existingSubcategory) return false;

    if (API_BASE_URL) {
      const deleteResponse = await fetch(`${API_BASE_URL}/categories/${existingSubcategory.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...createAuthHeaders(),
        },
      });

      await handleProtectedApiResponse(deleteResponse, 'Failed to delete subcategory in the backend');
    }

    setProducts((prev) =>
      prev.map((product) => ({
        ...product,
        subcategories: (product.subcategories || []).filter((name) => name !== subcategoryName),
      }))
    );

    if (API_BASE_URL) {
      await refreshCategoriesFromApi();
    } else {
      setCategories((prev) =>
        prev.map((category) =>
          category.name === parentCategoryName
            ? {
                ...category,
                subcategories: (category.subcategories || []).filter((item) => item.name !== subcategoryName),
              }
            : category
        )
      );
    }

    return true;
  }, [categories, refreshCategoriesFromApi]);

  const getCategoryByName = useCallback(
    (name) => categories.find((c) => c.name === name),
    [categories]
  );

  const adjustStock = useCallback((productId, payload = {}) => {
    const { change = 0, reason = 'Manual stock update', actor = 'Manager', reference = '' } = payload;
    const quantityChange = Number(change);
    if (!quantityChange) return null;

    let movementRecord = null;
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== productId) return product;

        const previousOnHand = Number(product.inventory?.onHand || 0);
        const newOnHand = Math.max(previousOnHand + quantityChange, 0);
        const actualChange = newOnHand - previousOnHand;
        const now = getNowIso();
        movementRecord = {
          id: `${product.id}-${Date.now()}`,
          type: actualChange >= 0 ? 'IN' : 'OUT',
          quantity: actualChange,
          previousOnHand,
          newOnHand,
          reason,
          actor,
          reference,
          at: now,
        };

        return {
          ...product,
          inventory: {
            ...product.inventory,
            onHand: newOnHand,
            reserved: Math.min(product.inventory?.reserved || 0, newOnHand),
            lastUpdatedAt: now,
            movements: [movementRecord, ...(product.inventory?.movements || [])].slice(0, 40),
          },
        };
      })
    );

    return movementRecord;
  }, []);

  const getInventorySummary = useCallback(() => {
    const totals = products.reduce(
      (acc, product) => {
        const onHand = Number(product.inventory?.onHand || 0);
        const reserved = Number(product.inventory?.reserved || 0);
        const available = Math.max(onHand - reserved, 0);
        acc.totalOnHand += onHand;
        acc.totalReserved += reserved;
        acc.totalAvailable += available;
        if (onHand <= 0) acc.outOfStock += 1;
        if (available <= Number(product.inventory?.reorderLevel || 0)) acc.lowStock += 1;
        return acc;
      },
      { totalOnHand: 0, totalReserved: 0, totalAvailable: 0, outOfStock: 0, lowStock: 0 }
    );
    return totals;
  }, [products]);

  const value = useMemo(
    () => ({
      products,
      categories,
      categoryNames,
      addProduct,
      updateProduct,
      deleteProduct,
      getProductById,
      getProductsByCategory,
      addCategory,
      deleteCategory,
      updateCategory,
      addSubcategory,
      updateSubcategory,
      deleteSubcategory,
      getCategoryByName,
      adjustStock,
      getInventorySummary,
    }),
    [
      products,
      categories,
      categoryNames,
      addProduct,
      updateProduct,
      deleteProduct,
      getProductById,
      getProductsByCategory,
      addCategory,
      deleteCategory,
      updateCategory,
      addSubcategory,
      updateSubcategory,
      deleteSubcategory,
      getCategoryByName,
      adjustStock,
      getInventorySummary,
    ]
  );

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductProvider');
  }
  return context;
}
