import { CALL_PHONE_DISPLAY } from './contactDetails';

export const BUSINESS = {
  legalName: 'SHOP FITTINGS RETAIL LTD',
  addressLines: ['3 LANGLEY CLOSE', 'ROMFORD', 'UK, RM3 8XB'],
  phone: CALL_PHONE_DISPLAY,
};

export const VAT_NUMBER = '477 287 344';

export const TERMS = [
  'All items remain the property of ELM SHELF LTD until paid for in full.',
  'Returns are subject to the terms and conditions at https://elm-shelf.co.uk/terms-and-conditions',
];

export const BANK_DETAILS = 'BANK DETAILS: SHOP FITTINGS RETAIL LTD | Acc. No.: 28842668 | Sort Code: 30-54-66';

const FIRST_PAGE_UNITS = 12;
const CONTINUATION_PAGE_UNITS = 22;
const SUMMARY_UNITS = 6;

export function formatDateTime(order) {
  if (!order?.createdAt) return `${order?.date || '-'} ${order?.orderTime || ''}`.trim();
  return new Date(order.createdAt).toLocaleString();
}

export function getCustomerName(order) {
  return (
    order.customer ||
    [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') ||
    'Customer'
  );
}

export function formatVariant(item) {
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

export function getAddressLines(order) {
  const address = order.shippingAddress || {};
  const cityLine = [address.city, address.state].filter(Boolean).join(', ');
  return [
    address.address,
    cityLine,
    address.zipCode,
  ].filter(Boolean);
}

export function getItemSubtotal(order, pricing) {
  if (pricing.subtotal !== undefined && pricing.subtotal !== null) {
    return Number(pricing.subtotal) || 0;
  }

  return (order.items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );
}

function getItemUnits(item) {
  const variant = formatVariant(item);
  const textLength = `${item?.name || ''} ${variant}`.trim().length;

  return Math.max(1, Math.ceil(textLength / 95));
}

export function buildInvoicePages(items = []) {
  const sourceItems = Array.isArray(items) ? items : [];

  if (sourceItems.length === 0) {
    return [{ items: [], showIntro: true, showSummary: true }];
  }

  const pages = [];
  let currentPage = {
    items: [],
    showIntro: true,
    showSummary: false,
    usedUnits: 0,
    capacity: FIRST_PAGE_UNITS,
  };

  const startNextPage = () => {
    pages.push(currentPage);
    currentPage = {
      items: [],
      showIntro: false,
      showSummary: false,
      usedUnits: 0,
      capacity: CONTINUATION_PAGE_UNITS,
    };
  };

  sourceItems.forEach((item, index) => {
    const units = getItemUnits(item);

    if (currentPage.items.length > 0 && currentPage.usedUnits + units > currentPage.capacity) {
      startNextPage();
    }

    currentPage.items.push({ item, itemNumber: index + 1 });
    currentPage.usedUnits += units;
  });

  if (currentPage.usedUnits + SUMMARY_UNITS <= currentPage.capacity) {
    currentPage.showSummary = true;
    pages.push(currentPage);
  } else {
    pages.push(currentPage);
    pages.push({
      items: [],
      showIntro: false,
      showSummary: true,
      usedUnits: SUMMARY_UNITS,
      capacity: CONTINUATION_PAGE_UNITS,
    });
  }

  return pages;
}
