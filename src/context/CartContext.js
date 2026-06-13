import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();
const API_BASE_URL = process.env.REACT_APP_API_URL;
const API_ORIGIN = API_BASE_URL ? new URL(API_BASE_URL).origin : '';

const normalizeAttributes = (attributes = {}) =>
  Object.fromEntries(
    Object.entries(attributes)
      .map(([key, value]) => [`${key || ''}`.trim(), `${value || ''}`.trim()])
      .filter(([key, value]) => key && value)
      .sort(([left], [right]) => left.localeCompare(right))
  );

const buildLineId = (productId, attributes = {}, cartItemId = null) => {
  if (cartItemId) return `backend-${cartItemId}`;
  const normalized = normalizeAttributes(attributes);
  const suffix = Object.entries(normalized)
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  return `${productId}::${suffix || 'default'}`;
};

const resolveMediaUrl = (value) => {
  if (!value) return '';
  if (/^(data:|blob:|https?:)/i.test(value)) return value;
  if (!API_ORIGIN) return value;
  if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
};

const mapBackendCartItem = (item = {}) => {
  const product = item.product || {};
  const primaryImage = Array.isArray(product.images)
    ? [...product.images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).find((image) => image.is_primary) || product.images[0]
    : null;
  const price = Number(product.sale_price ?? product.price ?? 0);

  return {
    id: product.id,
    cartItemId: item.id,
    lineId: buildLineId(product.id, {}, item.id),
    name: product.name || 'Unknown Product',
    description: product.description || '',
    price,
    salePrice: product.sale_price != null ? Number(product.sale_price) : '',
    image: resolveMediaUrl(primaryImage?.image_url || ''),
    quantity: Number(item.quantity || 1),
    selectedAttributes: {},
    selectedColor: null,
    selectedSize: null,
  };
};

export function CartProvider({ children }) {
  const { user, authFetch } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartToast, setCartToast] = useState({ visible: false, message: '', id: null });

  const isBackendCartUser = Boolean(API_BASE_URL && user && user.role === 'user');

  const loadCart = useCallback(async () => {
    if (!isBackendCartUser) {
      setCartItems([]);
      return [];
    }

    const response = await authFetch('/cart/');
    const data = await response.json().catch(() => null);
    const items = Array.isArray(data?.items) ? data.items.map(mapBackendCartItem) : [];
    setCartItems(items);
    return items;
  }, [authFetch, isBackendCartUser]);

  useEffect(() => {
    let cancelled = false;

    const syncCart = async () => {
      if (!isBackendCartUser) {
        setCartItems([]);
        return;
      }

      try {
        const items = await loadCart();
        if (!cancelled) {
          setCartItems(items);
        }
      } catch (error) {
        if (!cancelled) {
          setCartItems([]);
        }
      }
    };

    syncCart();

    return () => {
      cancelled = true;
    };
  }, [isBackendCartUser, loadCart]);

  const addToCart = useCallback(async (product, options = {}) => {
    const selectedAttributes = normalizeAttributes(options.attributes || {});
    const selectedColor = selectedAttributes.Color || selectedAttributes.Colour || options.color || product.colors?.[0] || null;
    const selectedSize = selectedAttributes.Size || options.size || product.sizes?.[0] || null;
    const selectedQuantity = Math.max(1, Number(options.quantity) || 1);
    const lineId = buildLineId(product.id, selectedAttributes);

    if (isBackendCartUser) {
      const response = await authFetch('/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: selectedQuantity,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to add item to cart');
      }

      const items = Array.isArray(data?.items) ? data.items.map(mapBackendCartItem) : [];
      setCartItems(items);
    } else {
      setCartItems((prevItems) => {
        const existingItem = prevItems.find((item) => item.lineId === lineId);

        if (existingItem) {
          return prevItems.map((item) =>
            item.lineId === lineId
              ? { ...item, quantity: item.quantity + selectedQuantity }
              : item
          );
        }

        return [
          ...prevItems,
          {
            ...product,
            lineId,
            selectedAttributes,
            selectedColor,
            selectedSize,
            quantity: selectedQuantity,
          },
        ];
      });
    }

    const messageBits = [
      `${selectedQuantity} x ${product.name}`,
      ...Object.entries(selectedAttributes).map(([key, value]) => `${key}: ${value}`),
    ].filter(Boolean);

    setCartToast({
      visible: true,
      message: `${messageBits.join(' | ')} added to cart`,
      id: Date.now(),
    });
  }, [authFetch, isBackendCartUser]);

  const removeFromCart = useCallback(async (lineId) => {
    const existing = cartItems.find((item) => item.lineId === lineId);
    if (!existing) return;

    if (isBackendCartUser && existing.cartItemId) {
      const response = await authFetch(`/cart/items/${existing.cartItemId}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to remove cart item');
      }
      const items = Array.isArray(data?.items) ? data.items.map(mapBackendCartItem) : [];
      setCartItems(items);
      return;
    }

    setCartItems((prevItems) => prevItems.filter((item) => item.lineId !== lineId));
  }, [authFetch, cartItems, isBackendCartUser]);

  const updateQuantity = useCallback(
    async (lineId, quantity) => {
      const existing = cartItems.find((item) => item.lineId === lineId);
      if (!existing) return;

      if (quantity <= 0) {
        await removeFromCart(lineId);
        return;
      }

      if (isBackendCartUser && existing.cartItemId) {
        const response = await authFetch(`/cart/items/${existing.cartItemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ quantity }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.detail || 'Unable to update cart quantity');
        }
        const items = Array.isArray(data?.items) ? data.items.map(mapBackendCartItem) : [];
        setCartItems(items);
        return;
      }

      setCartItems((prevItems) =>
        prevItems.map((item) => (item.lineId === lineId ? { ...item, quantity } : item))
      );
    },
    [authFetch, cartItems, isBackendCartUser, removeFromCart]
  );

  const totalPrice = useMemo(
    () =>
      cartItems.reduce((total, item) => {
        const price = item.salePrice || item.price;
        return total + price * item.quantity;
      }, 0),
    [cartItems]
  );
  const totalItems = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );
  const getTotalPrice = useCallback(() => totalPrice, [totalPrice]);
  const getTotalItems = useCallback(() => totalItems, [totalItems]);

  const clearCart = useCallback(async () => {
    if (isBackendCartUser) {
      const response = await authFetch('/cart/', {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || 'Unable to clear cart');
      }
    }
    setCartItems([]);
  }, [authFetch, isBackendCartUser]);

  const hideCartToast = useCallback(() => setCartToast((prev) => ({ ...prev, visible: false })), []);

  const value = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      getTotalPrice,
      getTotalItems,
      clearCart,
      cartToast,
      hideCartToast,
      totalPrice,
      totalItems,
      loadCart,
    }),
    [
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      getTotalPrice,
      getTotalItems,
      clearCart,
      cartToast,
      hideCartToast,
      totalPrice,
      totalItems,
      loadCart,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
