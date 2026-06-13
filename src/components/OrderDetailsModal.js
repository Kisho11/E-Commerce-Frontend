import React from 'react';

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

function OrderDetailsModal({ order, onClose, accentClass = 'text-primary' }) {
  if (!order) return null;

  return (
    <div className="order-print-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <div className="order-print-panel w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <h3 className={`text-2xl font-bold ${accentClass}`}>Order #{order.id}</h3>
            <p className="text-sm text-gray-600">Placed: {formatDateTime(order)}</p>
          </div>
          <div className="no-print flex gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <section className="rounded-lg border border-gray-200 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Order Meta</p>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Date:</strong> {order.date || '-'}</p>
            <p><strong>Time:</strong> {order.orderTime || '-'}</p>
            <p><strong>Created At:</strong> {order.createdAt || '-'}</p>
            <p><strong>Source:</strong> {order.source || '-'}</p>
          </section>

          <section className="rounded-lg border border-gray-200 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Customer</p>
            <p><strong>Name:</strong> {order.customer || '-'}</p>
            <p><strong>First Name:</strong> {order.customerFirstName || '-'}</p>
            <p><strong>Last Name:</strong> {order.customerLastName || '-'}</p>
            <p><strong>Email:</strong> {order.customerEmail || '-'}</p>
            <p><strong>Phone:</strong> {order.customerPhone || '-'}</p>
          </section>

          <section className="rounded-lg border border-gray-200 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Shipping</p>
            <p><strong>Address:</strong> {order.shippingAddress?.address || '-'}</p>
            <p><strong>City:</strong> {order.shippingAddress?.city || '-'}</p>
            <p><strong>State:</strong> {order.shippingAddress?.state || '-'}</p>
            <p><strong>ZIP:</strong> {order.shippingAddress?.zipCode || '-'}</p>
          </section>

          <section className="rounded-lg border border-gray-200 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Payment</p>
            <p><strong>Method:</strong> {order.payment?.method || '-'}</p>
            <p><strong>Card Last 4:</strong> {order.payment?.cardLast4 ? `**** ${order.payment.cardLast4}` : '-'}</p>
            <p><strong>Expiry:</strong> {order.payment?.expiryDate || '-'}</p>
          </section>
        </div>

        <section className="mt-4 rounded-lg border border-gray-200 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Pricing</p>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p><strong>Subtotal:</strong> {formatCurrency(order.pricing?.subtotal)}</p>
            <p><strong>Tax Rate:</strong> {`${((Number(order.pricing?.taxRate) || 0) * 100).toFixed(2)}%`}</p>
            <p><strong>Tax Amount:</strong> {formatCurrency(order.pricing?.taxAmount)}</p>
            <p><strong>Shipping Fee:</strong> {formatCurrency(order.pricing?.shippingFee)}</p>
            <p className="sm:col-span-2"><strong>Total:</strong> {formatCurrency(order.amount)}</p>
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-gray-200 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Items</p>
          {order.items?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Unit Price</th>
                    <th className="px-3 py-2 text-left">Line Total</th>
                    <th className="px-3 py-2 text-left">Variant</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.lineId || `${item.id}-${item.name}`} className="border-t border-gray-200">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{formatCurrency(item.price)}</td>
                      <td className="px-3 py-2">{formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}</td>
                      <td className="px-3 py-2">
                        {formatVariant(item) || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No items found.</p>
          )}
        </section>

      </div>
    </div>
  );
}

export default OrderDetailsModal;
