import React from 'react';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { CALL_PHONE_DISPLAY } from '../utils/contactDetails';
import { formatShippingFee } from '../utils/shipping';

const BUSINESS = {
  legalName: 'SHOP FITTINGS RETAIL LTD',
  addressLines: ['3 LANGLEY CLOSE', 'ROMFORD', 'UK, RM3 8XB'],
  phone: CALL_PHONE_DISPLAY,
};

const VAT_NUMBER = '477 287 344';
const TERMS = [
  'All items remain the property of ELM SHELF LTD until paid for in full.',
  'Returns are subject to the terms and conditions at www.elmshelf.co.uk/terms&conditions',
];
const BANK_DETAILS = 'BANK DETAILS: SHOP FITTINGS RETAIL LTD | Acc. No.: 28842668 | Sort Code: 30-54-66';

function formatCurrency(value) {
  return `\u00a3${(Number(value) || 0).toFixed(2)}`;
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

function getCustomerName(order) {
  return (
    order.customer ||
    [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') ||
    'Customer'
  );
}

function getAddressLines(order) {
  const address = order.shippingAddress || {};
  const cityLine = [address.city, address.state].filter(Boolean).join(', ');
  return [
    address.address,
    cityLine,
    address.zipCode,
  ].filter(Boolean);
}

function getItemSubtotal(order, pricing) {
  if (pricing.subtotal !== undefined && pricing.subtotal !== null) {
    return Number(pricing.subtotal) || 0;
  }

  return (order.items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );
}

function OrderDetailsModal({ order, onClose, accentClass = 'text-primary' }) {
  if (!order) return null;

  const pricing = order.pricing || {};
  const itemSubtotal = getItemSubtotal(order, pricing);
  const shippingFee = Number(pricing.shippingFee || 0);
  const discountPercentage = Number(pricing.discountPercentage || 0);
  const discountAmount = Number(pricing.discountAmount || 0);
  const discountedSubtotal = Number(pricing.discountedSubtotal ?? Math.max(itemSubtotal - discountAmount, 0));
  const vatRate = `${Math.round(Number(pricing.taxRate ?? 0.2) * 100)}%`;
  const vatAmount = Number(pricing.taxAmount || 0);
  const addressLines = getAddressLines(order);

  return (
    <div className="order-print-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="order-print-panel flex h-[82svh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
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

        <div className="order-print-content overflow-y-scroll bg-gray-100 px-3 py-5 text-sm sm:px-6">
          <article className="mx-auto flex aspect-[210/297] w-[794px] max-w-full flex-col bg-white px-8 py-9 text-slate-900 shadow-sm sm:px-10">
            <header className="grid gap-6 border-b border-[#d94b43] pb-5 md:grid-cols-[1fr_240px]">
              <div>
                <img src="/elmshelf-invoice-logo.png" alt="Elmshelf logo" className="h-auto w-64 max-w-full object-contain" />
                <div className="mt-6 space-y-1 text-xs font-semibold uppercase leading-relaxed text-slate-700">
                  <p>{BUSINESS.legalName}</p>
                  {BUSINESS.addressLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p>Tel: {BUSINESS.phone}</p>
                </div>
              </div>

              <div className="text-left md:text-right">
                <h1 className="text-2xl font-extrabold uppercase tracking-normal text-slate-900">INVOICE</h1>
                <dl className="mt-7 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 md:justify-end">
                    <dt className="font-bold">Invoice Number:</dt>
                    <dd>#{order.id}</dd>
                  </div>
                  <div className="flex justify-between gap-4 md:justify-end">
                    <dt className="font-bold">VAT Number:</dt>
                    <dd>{VAT_NUMBER}</dd>
                  </div>
                  <div className="flex justify-between gap-4 md:justify-end">
                    <dt className="font-bold">Order Date:</dt>
                    <dd>{formatDateTime(order)}</dd>
                  </div>
                </dl>
              </div>
            </header>

            <section className="mt-8 grid gap-6 md:grid-cols-[1fr_240px]">
              <div>
                <h2 className="text-base font-bold">Bill To</h2>
                <div className="mt-1.5 space-y-1 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{getCustomerName(order)}</p>
                  {addressLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {order.customerEmail && <p>{order.customerEmail}</p>}
                  {order.customerPhone && <p>{order.customerPhone}</p>}
                </div>
              </div>
            </section>

            <section className="mt-10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="w-14 px-3 py-2 text-left font-bold">S.No</th>
                      <th className="px-3 py-2 text-left font-bold">Description</th>
                      <th className="w-16 px-3 py-2 text-right font-bold">Qty</th>
                      <th className="w-24 px-3 py-2 text-right font-bold">Rate</th>
                      <th className="w-28 px-3 py-2 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items?.length ? (
                      order.items.map((item, index) => {
                        const variant = formatVariant(item);
                        const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);

                        return (
                          <tr key={item.lineId || `${item.id}-${item.name}`} className="border-b border-gray-200">
                            <td className="px-3 py-3 align-top">{index + 1}</td>
                            <td className="px-3 py-3 align-top">
                              <p className="font-semibold text-slate-900">{item.name || '-'}</p>
                              {variant && <p className="mt-1 text-xs text-slate-500">{variant}</p>}
                            </td>
                            <td className="px-3 py-3 text-right align-top">{item.quantity || 0}</td>
                            <td className="px-3 py-3 text-right align-top">{formatCurrency(item.price)}</td>
                            <td className="px-3 py-3 text-right align-top font-semibold">{formatCurrency(lineTotal)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="border-b border-gray-200">
                        <td className="px-3 py-4 text-slate-600" colSpan={5}>No items found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-auto grid gap-8 pt-10 md:grid-cols-[1fr_260px]">
              <div className="text-xs leading-relaxed text-slate-700">
                <p className="mb-3 text-sm font-bold uppercase text-slate-900">TERMS & CONDITIONS</p>
                {TERMS.map((term) => (
                  <p key={term}>{term}</p>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <p className="mb-3 text-lg font-bold text-slate-900">Order Summary</p>
                <div className="flex justify-between gap-4">
                  <span>Sub Total:</span>
                  <span>{formatCurrency(itemSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <>
                    <div className="flex justify-between gap-4 text-green-700">
                      <span>Global Discount ({discountPercentage.toFixed(2)}%):</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Discounted Subtotal:</span>
                      <span>{formatCurrency(discountedSubtotal)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between gap-4">
                  <span>Shipping:</span>
                  <span>{formatShippingFee(shippingFee)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>VAT ({vatRate}):</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
                <div className="mt-3 flex justify-between gap-4 border-t border-slate-300 pt-3 text-base font-extrabold">
                  <span>Total:</span>
                  <span>{formatCurrency(order.amount)}</span>
                </div>
              </div>
            </section>

            <footer className="mt-10 border-t border-gray-300 pt-4 text-center text-xs font-bold text-slate-800">
              {BANK_DETAILS}
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
