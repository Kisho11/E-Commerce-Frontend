import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();
const API_BASE_URL = process.env.REACT_APP_API_URL;
const API_ORIGIN = API_BASE_URL ? new URL(API_BASE_URL).origin : '';
const GUEST_CART_KEY = 'guestCartItems';

const readGuestCartItems = () => {
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeGuestCartItems = (items) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

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
  const [cartItems, setCartItems] = useState(() => readGuestCartItems());
  const [selectedLineIds, setSelectedLineIds] = useState(null);
  const [cartToast, setCartToast] = useState({ visible: false, message: '', id: null });
  const mergedGuestCartForUserRef = useRef(null);

  const isBackendCartUser = Boolean(API_BASE_URL && user && user.role === 'user');

  const loadCart = useCallback(async () => {
    if (!isBackendCartUser) {
      const guestItems = readGuestCartItems();
      setCartItems(guestItems);
      return guestItems;
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
        setCartItems(readGuestCartItems());
        return;
      }

      try {
        const guestItems = readGuestCartItems();
        let items = await loadCart();

        if (guestItems.length > 0 && mergedGuestCartForUserRef.current !== user?.id) {
          for (const item of guestItems) {
            await authFetch('/cart/items', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                product_id: item.id,
                quantity: Math.max(1, Number(item.quantity) || 1),
              }),
            });
          }
          localStorage.removeItem(GUEST_CART_KEY);
          mergedGuestCartForUserRef.current = user?.id || 'customer';
          items = await loadCart();
        }

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
  }, [authFetch, isBackendCartUser, loadCart, user?.id]);

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
        let nextItems;

        if (existingItem) {
          nextItems = prevItems.map((item) =>
            item.lineId === lineId
              ? { ...item, quantity: item.quantity + selectedQuantity }
              : item
          );
        } else {
          nextItems = [
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
        }

        writeGuestCartItems(nextItems);
        return nextItems;
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

    setCartItems((prevItems) => {
      const nextItems = prevItems.filter((item) => item.lineId !== lineId);
      writeGuestCartItems(nextItems);
      return nextItems;
    });
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

      setCartItems((prevItems) => {
        const nextItems = prevItems.map((item) => (item.lineId === lineId ? { ...item, quantity } : item));
        writeGuestCartItems(nextItems);
        return nextItems;
      });
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

  const getSelectedCartItems = useCallback(
    () => (selectedLineIds === null ? cartItems : cartItems.filter((item) => selectedLineIds.includes(item.lineId))),
    [cartItems, selectedLineIds]
  );
  const getSelectedTotalPrice = useCallback(
    () =>
      getSelectedCartItems().reduce((total, item) => {
        const price = item.salePrice || item.price;
        return total + price * item.quantity;
      }, 0),
    [getSelectedCartItems]
  );
  const isCartItemSelected = useCallback(
    (lineId) => selectedLineIds === null || selectedLineIds.includes(lineId),
    [selectedLineIds]
  );
  const toggleCartItemSelection = useCallback(
    (lineId) => {
      setSelectedLineIds((previous) => {
        const next = new Set(previous === null ? cartItems.map((item) => item.lineId) : previous);
        if (next.has(lineId)) next.delete(lineId);
        else next.add(lineId);
        return [...next];
      });
    },
    [cartItems]
  );
  const setAllCartItemsSelected = useCallback(
    (selected) => setSelectedLineIds(selected ? null : []),
    []
  );

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
    setSelectedLineIds(null);
    if (!isBackendCartUser) {
      localStorage.removeItem(GUEST_CART_KEY);
    }
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
      getSelectedCartItems,
      getSelectedTotalPrice,
      isCartItemSelected,
      toggleCartItemSelection,
      setAllCartItemsSelected,
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
      getSelectedCartItems,
      getSelectedTotalPrice,
      isCartItemSelected,
      toggleCartItemSelection,
      setAllCartItemsSelected,
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
