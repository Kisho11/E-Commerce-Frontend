import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import UiIcon from '../components/UiIcon';
import Seo from '../components/Seo';

function Checkout() {
  const navigate = useNavigate();
  const { cartItems, getTotalPrice, clearCart, loadCart } = useCart();
  const { placeOrder, loadOrders } = useOrders();
  const { user, authFetch } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const subtotal = getTotalPrice();
  const taxRate = 0.1;
  const taxAmount = subtotal * taxRate;
  const shippingFee = 0;
  const totalWithTax = subtotal + taxAmount + shippingFee;
  const requiresBackendCheckout = Boolean(process.env.REACT_APP_API_URL);

  if (cartItems.length === 0 && !orderPlaced) {
    return (
      <div className="container mx-auto px-4 py-16 text-center sm:px-8">
        <Seo title="Checkout" description="Complete your Elmshelf checkout securely." noindex />
        <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-4">Checkout</h1>
        <p className="text-lg text-gray-600 mb-6">Your cart is empty</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (user && !user.isEmailVerified) {
    return (
      <div className="container mx-auto px-4 py-16 text-center sm:px-8">
        <Seo title="Checkout" description="Complete your Elmshelf checkout securely." noindex />
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Verify Your Email</h1>
        <p className="text-lg text-gray-600 mb-2">You need to verify your email address before placing an order.</p>
        <p className="text-sm text-gray-500 mb-8">Check your inbox for the verification link, or go to your account to resend it.</p>
        <Link
          to="/customer-portal"
          className="inline-block bg-primary text-white px-8 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
        >
          Go to My Account
        </Link>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSubmitError('');
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const buildOrderPayload = () => {
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const sanitizedCardDigits = formData.cardNumber.replace(/\D/g, '');
    const cardLast4 = sanitizedCardDigits.slice(-4);

    return {
      customerId: user?.id ?? null,
      customerFirstName: formData.firstName,
      customerLastName: formData.lastName,
      customer: fullName || formData.firstName,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      shippingAddress: {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
      },
      amount: totalWithTax,
      pricing: {
        subtotal,
        taxRate,
        taxAmount,
        shippingFee,
        total: totalWithTax,
      },
      payment: {
        method: 'Card',
        cardLast4: cardLast4 || '',
        expiryDate: formData.expiryDate || '',
      },
      items: cartItems.map((item) => ({
        lineId: item.lineId,
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.salePrice || item.price,
        selectedAttributes: item.selectedAttributes || null,
        selectedColor: item.selectedColor || null,
        selectedSize: item.selectedSize || null,
      })),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    // Validate form
    if (
      !formData.firstName ||
      !formData.email ||
      !formData.address ||
      !formData.cardNumber
    ) {
      alert('Please fill in all required fields');
      return;
    }

    if (requiresBackendCheckout && (!user || user.role !== 'user')) {
      setSubmitError('Please sign in with a customer account before checking out.');
      navigate('/login?mode=customer-signin');
      return;
    }

    if (requiresBackendCheckout) {
      setSubmitting(true);
      try {
        const orderPayload = buildOrderPayload();
        const addressResponse = await authFetch('/users/me/addresses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: orderPayload.customer,
            phone: orderPayload.customerPhone || 'N/A',
            address_line1: orderPayload.shippingAddress.address,
            address_line2: null,
            city: orderPayload.shippingAddress.city || '-',
            state: orderPayload.shippingAddress.state || '-',
            postal_code: orderPayload.shippingAddress.zipCode || '-',
            country: 'GB',
            is_default: false,
          }),
        });
        const addressData = await addressResponse.json().catch(() => null);
        if (!addressResponse.ok) {
          throw new Error(addressData?.detail || 'Unable to save your shipping address');
        }

        const orderResponse = await authFetch('/orders/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address_id: addressData.id,
            notes: '',
          }),
        });
        const orderData = await orderResponse.json().catch(() => null);
        if (!orderResponse.ok) {
          throw new Error(orderData?.detail || 'Unable to place your order');
        }

        const createdOrder = placeOrder({
          ...orderPayload,
          id: orderData?.id,
        });

        await clearCart();
        await loadCart().catch(() => {});
        await loadOrders().catch(() => {});
        setPlacedOrder(createdOrder);
        setOrderPlaced(true);
        return;
      } catch (error) {
        setSubmitError(error.message || 'Unable to place your order');
        return;
      } finally {
        setSubmitting(false);
      }
    }

    const createdOrder = placeOrder(buildOrderPayload());
    setPlacedOrder(createdOrder);
    setOrderPlaced(true);
    await clearCart();
  };

  if (orderPlaced) {
    return (
      <div className="container mx-auto px-4 py-16 text-center sm:px-8">
        <Seo title="Order Confirmed" description="Your Elmshelf order has been confirmed." noindex />
        <div className="max-w-md mx-auto bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 rounded-xl p-12 shadow-xl">
          <div className="mb-6 flex justify-center animate-bounce">
            <UiIcon name="check" className="h-14 w-14 text-green-700" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-green-700 mb-4">Order Confirmed!</h1>
          <p className="text-gray-700 mb-4 text-lg">
            Thank you for your purchase. Your order has been successfully placed.
          </p>
          <div className="bg-white p-4 rounded-lg mb-6 text-sm text-gray-600">
            <p className="mb-2">
              <strong>Order ID:</strong> #{placedOrder?.id}
            </p>
            {placedOrder?.orderTime && (
              <p className="mb-2">
                <strong>Placed at:</strong> {placedOrder.orderTime}
              </p>
            )}
            <p className="mb-2">
              <strong>Confirmation email:</strong> {formData.email}
            </p>
            <p>
              <strong>Delivery:</strong> 2-5 business days
            </p>
          </div>
          <p className="text-gray-600 mb-8">
            Check your email for order details and tracking information.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-8">
      <Seo title="Checkout" description="Complete your Elmshelf checkout securely." noindex />
      <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {submitError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}
          {/* Shipping Information */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
              <UiIcon name="truck" className="h-6 w-6" />
              Shipping Information
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
              <UiIcon name="payment" className="h-6 w-6" />
              Payment Information
            </h2>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Card Number *
              </label>
              <input
                type="text"
                name="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={formData.cardNumber}
                onChange={handleChange}
                maxLength="19"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Expiry Date (MM/YY)
                </label>
                <input
                  type="text"
                  name="expiryDate"
                  placeholder="12/25"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  maxLength="5"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  name="cvv"
                  placeholder="123"
                  value={formData.cvv}
                  onChange={handleChange}
                  maxLength="4"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="flex-1 border-2 border-primary text-primary py-3 rounded-lg font-bold hover:bg-primary hover:text-white transition"
            >
              Back to Cart
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-accent text-primary py-3 rounded-lg font-bold hover:bg-yellow-600 transition shadow-md hover:shadow-lg disabled:opacity-60"
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </form>

        {/* Order Summary */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-lg h-fit sticky top-24">
          <h2 className="text-2xl font-bold text-primary mb-6">Order Summary</h2>

          <div className="space-y-3 mb-6 pb-6 border-b border-gray-300 max-h-64 overflow-y-auto">
            {cartItems.map((item) => (
              <div key={item.lineId || `${item.id}-${item.selectedColor || ''}-${item.selectedSize || ''}`} className="flex justify-between text-sm bg-white p-3 rounded-lg">
                {(() => {
                  const selectedAttributeLabels =
                    item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0
                      ? Object.entries(item.selectedAttributes).map(([key, value]) => `${key}: ${value}`)
                      : [
                          item.selectedColor ? `Color: ${item.selectedColor}` : null,
                          item.selectedSize ? `Size: ${item.selectedSize}` : null,
                        ].filter(Boolean);

                  return (
                    <>
                <span className="text-gray-700">
                  <strong>{item.name}</strong> × {item.quantity}
                  {selectedAttributeLabels.length > 0 && (
                    <span className="block text-xs text-gray-500 mt-1">
                      {selectedAttributeLabels.join(' | ')}
                    </span>
                  )}
                </span>
                <span className="font-bold text-primary">
                  £{((item.salePrice || item.price) * item.quantity).toFixed(2)}
                </span>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-6 pb-6 border-b border-gray-300">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-semibold">£{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Shipping:</span>
              <span className="font-semibold text-green-600">Free</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Tax (10%):</span>
              <span className="font-semibold">£{taxAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between text-xl font-bold text-primary bg-white p-4 rounded-lg">
            <span>Total:</span>
            <span>£{totalWithTax.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
