import React from 'react';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { CALL_PHONE_DISPLAY } from '../utils/contactDetails';

const BUSINESS = {
  name: 'Elmshelf',
  address: '3, Langley Close, Romford, RM3 8XB',
  phone: CALL_PHONE_DISPLAY,
  hoursWeekday: 'Monday-Saturday: 8:00 AM - 7:00 PM',
  hoursSunday: 'Sunday: 9:00 AM - 5:00 PM',
};

function formatCurrency(value) {
  return `£${(Number(value) || 0).toFixed(2)}`;
}

function formatDateTime(order) {
  if (!order?.createdAt) return `${order?.date || '-'} ${order?.orderTime || ''}`.trim();
  return new Date(order.createdAt).toLocaleString();
}

function formatVariant(item) {
  if (item?.selectedAttributes && Object.keys(item.selectedAttributes).length > 0) {
    return Object.entries(item.selectedAttributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
  }

  return [
    item?.selectedColor ? `Color: ${item.selectedColor}` : null,
    item?.selectedSize ? `Size: ${item.selectedSize}` : null,
  ].filter(Boolean).join(' | ');
}

function formatDeliveryMode(value = '') {
  if (value === 'ship') return 'Ship to address';
  if (value === 'pickup') return 'Pickup from store';
  return value || '-';
}

function getCustomerName(order) {
  return (
    order.customer ||
    [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') ||
    'Customer'
  );
}

function getDeliveryNote(order) {
  const note = (order.notes || order.deliveryNote || '').trim();
  const duplicateDeliveryMode = `Delivery mode: ${formatDeliveryMode(order.deliveryMode)}`.toLowerCase();
  return note.toLowerCase() === duplicateDeliveryMode ? '' : note;
}

function OrderDetailsModal({ order, onClose, accentClass = 'text-primary' }) {
  if (!order) return null;

  const pricing = order.pricing || {};
  const subtotal = pricing.subtotal ?? order.amount;
  const discountPercentage = Number(pricing.discountPercentage || 0);
  const discountAmount = Number(pricing.discountAmount || 0);
  const discountedSubtotal = Number(pricing.discountedSubtotal ?? Math.max(Number(subtotal || 0) - discountAmount, 0));
  const vatRate = `${((Number(pricing.taxRate) || 0) * 100).toFixed(2)}%`;
  const deliveryNote = getDeliveryNote(order);

  return (
    <div className="order-print-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="order-print-panel flex h-[82svh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="no-print flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
          <div>
            <h3 className={`text-xl font-bold ${accentClass}`}>Invoice #{order.id}</h3>
            <p className="text-sm text-gray-600">Placed: {formatDateTime(order)}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadInvoicePdf(order)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700"
            >
              Close
            </button>
          </div>
        </div>

        <div className="order-print-content overflow-y-scroll px-4 py-5 text-sm sm:px-6">
          <header className="flex flex-col gap-5 border-b-2 border-slate-900 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <img src="/elmshelf-invoice-logo.png" alt="Elmshelf logo" className="h-auto w-56 max-w-full object-contain sm:w-72" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Invoice from</p>
                <h1 className="mt-1 text-3xl font-extrabold text-slate-950">{BUSINESS.name}</h1>
                <p className="mt-2 max-w-sm font-semibold leading-relaxed text-slate-700">{BUSINESS.address}</p>
                <p className="mt-1 font-bold text-primary">{BUSINESS.phone}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left sm:min-w-56 sm:text-right">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Invoice</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-950">#{order.id}</p>
              <p className="mt-2 text-sm text-slate-600">Placed: {formatDateTime(order)}</p>
              <p className="mt-1 text-sm font-bold text-slate-800">Status: {order.status || '-'}</p>
            </div>
          </header>

          <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Bill To</p>
              <p className="font-bold text-slate-900">{getCustomerName(order)}</p>
              {order.customerEmail && <p className="mt-1 text-slate-700">{order.customerEmail}</p>}
              {order.customerPhone && <p className="mt-1 text-slate-700">{order.customerPhone}</p>}
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Delivery</p>
              <p><strong>Mode:</strong> {formatDeliveryMode(order.deliveryMode)}</p>
              <p className="mt-1">{order.shippingAddress?.address || '-'}</p>
              <p>{[order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.zipCode].filter(Boolean).join(', ') || '-'}</p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Payment</p>
              <p><strong>Method:</strong> {order.payment?.method || '-'}</p>
              {order.payment?.cardLast4 && <p><strong>Card:</strong> **** {order.payment.cardLast4}</p>}
              <p><strong>Total:</strong> {formatCurrency(order.amount)}</p>
            </div>
          </section>

          <section className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Items</p>
            {order.items?.length ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-left">Variant</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.lineId || `${item.id}-${item.name}`} className="border-t border-gray-200">
                        <td className="px-3 py-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="px-3 py-3 text-slate-600">{formatVariant(item) || '-'}</td>
                        <td className="px-3 py-3 text-right">{item.quantity}</td>
                        <td className="px-3 py-3 text-right">{formatCurrency(item.price)}</td>
                        <td className="px-3 py-3 text-right font-bold">{formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600">No items found.</p>
            )}
          </section>

          <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Store Hours</p>
              <p className="font-semibold text-slate-800">{BUSINESS.hoursWeekday}</p>
              <p className="mt-1 font-semibold text-slate-700">{BUSINESS.hoursSunday}</p>
              {deliveryNote && (
                <>
                  <p className="mt-4 mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">Delivery Notes</p>
                  <p className="whitespace-pre-line text-sm text-gray-700">{deliveryNote}</p>
                </>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Totals</p>
              <div className="space-y-2">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <>
                    <div className="flex justify-between gap-4 text-green-700">
                      <span>Global Discount ({discountPercentage.toFixed(2)}%)</span>
                      <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">Discounted Subtotal</span>
                      <span className="font-semibold">{formatCurrency(discountedSubtotal)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between gap-4">
                  <span className="text-slate-600">Shipping</span>
                  <span className="font-semibold">{formatCurrency(pricing.shippingFee)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-600">VAT ({vatRate})</span>
                  <span className="font-semibold">{formatCurrency(pricing.taxAmount)}</span>
                </div>
                <div className="mt-3 flex justify-between gap-4 border-t border-slate-200 pt-3 text-lg font-extrabold text-slate-950">
                  <span>Total</span>
                  <span>{formatCurrency(order.amount)}</span>
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Thank you for choosing {BUSINESS.name}.</p>
            <p className="mt-1">Please keep this invoice for your records.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
