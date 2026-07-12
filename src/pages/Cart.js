import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Seo from '../components/Seo';

const CHECKOUT_TAX_RATE = Number(process.env.REACT_APP_CHECKOUT_TAX_RATE ?? '0.2');
const checkoutTaxLabel = `${Math.round(CHECKOUT_TAX_RATE * 100)}%`;

function formatSelectedAttributes(item) {
  if (item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0) {
    return Object.entries(item.selectedAttributes).map(([key, value]) => `${key}: ${value}`);
  }

  return [
    item.selectedColor ? `Color: ${item.selectedColor}` : null,
    item.selectedSize ? `Size: ${item.selectedSize}` : null,
  ].filter(Boolean);
}

function ShoppingCart() {
  const navigate = useNavigate();
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    getSelectedCartItems,
    getSelectedTotalPrice,
    isCartItemSelected,
    toggleCartItemSelection,
    setAllCartItemsSelected,
  } = useCart();
  const selectedCartItems = getSelectedCartItems();
  const selectedSubtotal = getSelectedTotalPrice();
  const selectedTaxAmount = selectedSubtotal * CHECKOUT_TAX_RATE;
  const selectedTotal = selectedSubtotal + selectedTaxAmount;
  const allItemsSelected = selectedCartItems.length === cartItems.length;

  if (cartItems.length === 0) {
    return (
      <div className="shell py-16 text-center">
        <Seo title="Shopping Cart" description="Review the items in your Elmshelf cart before checkout." noindex />
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Shopping Cart</h1>
        <p className="text-lg text-slate-600 mb-8">Your cart is empty</p>
        <Link
          to="/"
          className="rounded-lg bg-slate-900 px-8 py-3 font-semibold text-white hover:bg-red-700 transition inline-block"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="shell py-8">
      <Seo title="Shopping Cart" description="Review the items in your Elmshelf cart before checkout." noindex />
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={allItemsSelected}
              onChange={(event) => setAllCartItemsSelected(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            Select all items ({selectedCartItems.length} of {cartItems.length})
          </label>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1">
            {cartItems.map((item) => (
              <div
                key={item.lineId}
                className={`flex flex-col gap-3 rounded-xl bg-white p-3 shadow transition hover:shadow-lg sm:gap-4 sm:p-6 lg:flex-row ${
                  isCartItemSelected(item.lineId) ? 'ring-2 ring-primary/20' : 'opacity-70'
                }`}
              >
                <label className="flex cursor-pointer items-center gap-2 self-start text-xs font-semibold text-slate-700 sm:text-sm">
                  <input
                    type="checkbox"
                    checked={isCartItemSelected(item.lineId)}
                    onChange={() => toggleCartItemSelection(item.lineId)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    aria-label={`Select ${item.name} for checkout`}
                  />
                  Select
                </label>
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-28 w-full object-cover rounded-lg sm:h-28 sm:w-28"
                  />
                )}

                <div className="flex-1">
                  <Link
                    to={`/product/${item.id}`}
                    className="text-sm font-bold text-slate-900 transition hover:text-blue-700 sm:text-xl"
                  >
                    {item.name}
                  </Link>
                  <p className="mb-2 text-xs text-slate-600 sm:mb-3 sm:text-sm line-clamp-2" dangerouslySetInnerHTML={{ __html: item.description }} />
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formatSelectedAttributes(item).map((label) => (
                      <span key={`${item.lineId}-${label}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 sm:px-3 sm:py-1 sm:text-xs">
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="text-blue-700 font-bold text-sm sm:text-lg">£{item.salePrice || item.price} each</p>
                </div>

                <div className="flex flex-col items-start justify-between gap-3 sm:items-end">
                  <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg sm:gap-3 sm:p-2">
                    <button
                      onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                      className="px-2 py-1 bg-slate-300 rounded hover:bg-slate-400 font-bold sm:px-3"
                    >
                      −
                    </button>
                    <span className="w-7 text-center font-bold text-sm sm:w-8 sm:text-base">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                      className="px-2 py-1 bg-slate-300 rounded hover:bg-slate-400 font-bold sm:px-3"
                    >
                      +
                    </button>
                  </div>

                  <div className="mt-1 text-left sm:mt-4 sm:text-right">
                    <p className="text-lg font-bold text-slate-900 sm:text-2xl">
                      £{((item.salePrice || item.price) * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.lineId)}
                      className="text-blue-500 hover:text-blue-700 text-xs mt-1 underline font-semibold sm:mt-3 sm:text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/')}
            className="text-blue-700 hover:text-blue-500 mt-8 font-semibold transition"
          >
            ← Continue Shopping
          </button>
        </div>

        <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-lg h-fit sticky top-24">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Order Summary</h2>

          <div className="space-y-4 border-b border-slate-200 pb-4 mb-4">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-semibold text-slate-900">£{selectedSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Shipping:</span>
              <span className="font-semibold text-green-600">Free</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Tax ({checkoutTaxLabel}):</span>
              <span className="font-semibold text-slate-900">£{selectedTaxAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between text-2xl font-bold text-slate-900 mb-6 bg-slate-50 p-4 rounded-lg">
            <span>Total:</span>
            <span>£{selectedTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            disabled={selectedCartItems.length === 0}
            className="mb-4 w-full rounded-lg bg-slate-900 px-4 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {selectedCartItems.length > 0 ? `Checkout (${selectedCartItems.length} selected)` : 'Select items to checkout'}
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full border border-slate-300 text-slate-700 py-3 px-4 rounded-lg font-semibold hover:bg-slate-100 transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShoppingCart;
