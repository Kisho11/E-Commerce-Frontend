import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CALL_PHONE_DISPLAY } from './contactDetails';
import { formatShippingFee } from './shipping';

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

const money = (value) => `\u00a3${(Number(value) || 0).toFixed(2)}`;

const imageToDataUrl = (src) => new Promise((resolve) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      resolve('');
      return;
    }
    context.drawImage(image, 0, 0);
    resolve(canvas.toDataURL('image/png'));
  };
  image.onerror = () => resolve('');
  image.src = src;
});

const formatDateTime = (order) => {
  if (!order?.createdAt) return `${order?.date || '-'} ${order?.orderTime || ''}`.trim();
  return new Date(order.createdAt).toLocaleString();
};

const getCustomerName = (order) => (
  order.customer ||
  [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') ||
  'Customer'
);

const formatVariant = (item) => {
  if (item?.selectedAttributes && Object.keys(item.selectedAttributes).length > 0) {
    return Object.entries(item.selectedAttributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
  }

  return [
    item?.selectedColor ? `Color: ${item.selectedColor}` : null,
    item?.selectedSize ? `Size: ${item.selectedSize}` : null,
  ].filter(Boolean).join(' | ');
};

const getAddressLines = (order) => {
  const address = order.shippingAddress || {};
  const cityLine = [address.city, address.state].filter(Boolean).join(', ');
  return [
    address.address,
    cityLine,
    address.zipCode,
  ].filter(Boolean);
};

const getItemSubtotal = (order, pricing) => {
  if (pricing.subtotal !== undefined && pricing.subtotal !== null) {
    return Number(pricing.subtotal) || 0;
  }

  return (order.items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );
};

const writeLines = (doc, lines, x, y, lineHeight = 5) => {
  lines.filter(Boolean).forEach((line, index) => {
    doc.text(String(line), x, y + index * lineHeight);
  });
  return y + lines.filter(Boolean).length * lineHeight;
};

const drawFooter = (doc, margin, pageWidth, pageHeight) => {
  doc.setDrawColor(221, 221, 221);
  doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(41, 41, 41);
  doc.text(BANK_DETAILS, pageWidth / 2, pageHeight - 12, { align: 'center' });
};

export async function downloadInvoicePdf(order) {
  if (!order) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const pricing = order.pricing || {};
  const itemSubtotal = getItemSubtotal(order, pricing);
  const shippingFee = Number(pricing.shippingFee || 0);
  const discountPercentage = Number(pricing.discountPercentage || 0);
  const discountAmount = Number(pricing.discountAmount || 0);
  const discountedSubtotal = Number(pricing.discountedSubtotal ?? Math.max(itemSubtotal - discountAmount, 0));
  const vatRate = `${Math.round(Number(pricing.taxRate ?? 0.2) * 100)}%`;
  const vatAmount = Number(pricing.taxAmount || 0);
  const logoDataUrl = await imageToDataUrl('/elmshelf-invoice-logo.png');

  doc.setProperties({
    title: `Elmshelf Invoice #${order.id}`,
    subject: `Invoice for order #${order.id}`,
    author: BUSINESS.legalName,
  });

  doc.setTextColor(41, 41, 41);
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', margin, 14, 74, 16);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('ELMSHELF', margin, 24);
  }

  doc.setDrawColor(217, 75, 67);
  doc.setLineWidth(0.6);
  doc.line(margin, 35, margin + 72, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  writeLines(
    doc,
    [BUSINESS.legalName, ...BUSINESS.addressLines, `Tel: ${BUSINESS.phone}`],
    margin,
    48,
    5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INVOICE', pageWidth - margin, 22, { align: 'right' });

  const metaLabelX = pageWidth - margin - 50;
  const metaValueX = pageWidth - margin;
  const metaRows = [
    ['Invoice Number:', `#${order.id}`],
    ['VAT Number:', VAT_NUMBER],
    ['Order Date:', formatDateTime(order)],
  ];

  doc.setFontSize(9);
  metaRows.forEach(([label, value], index) => {
    const y = 36 + index * 8;
    doc.setFont('helvetica', 'bold');
    doc.text(label, metaLabelX, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(value, metaValueX, y, { align: 'right' });
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Bill To', margin, 92);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  writeLines(
    doc,
    [
      getCustomerName(order),
      ...getAddressLines(order),
      order.customerEmail || '',
      order.customerPhone || '',
    ],
    margin,
    98,
    5
  );

  const tableRows = (order.items || []).map((item, index) => {
    const variant = formatVariant(item);
    const description = [item.name || '-', variant].filter(Boolean).join('\n');

    return [
      String(index + 1),
      description,
      String(item.quantity || 0),
      money(item.price),
      money((Number(item.price) || 0) * (Number(item.quantity) || 0)),
    ];
  });

  autoTable(doc, {
    startY: 128,
    head: [['S.No', 'Description', 'Qty', 'Rate', 'Amount']],
    body: tableRows.length > 0 ? tableRows : [['-', 'No items found', '-', '-', '-']],
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [221, 221, 221],
      lineWidth: 0.1,
      textColor: [41, 41, 41],
      valign: 'top',
    },
    headStyles: {
      fillColor: [41, 41, 41],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 94 },
      2: { halign: 'right', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 24 },
      4: { halign: 'right', cellWidth: 25 },
    },
    margin: { left: margin, right: margin },
  });

  let summaryY = pageHeight - 62;
  if (doc.lastAutoTable.finalY > summaryY - 10) {
    doc.addPage();
    summaryY = pageHeight - 62;
  }

  const termsX = margin;
  const totalsLabelX = pageWidth - margin - 38;
  const totalsValueX = pageWidth - margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(41, 41, 41);
  doc.text('TERMS & CONDITIONS', termsX, summaryY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  writeLines(doc, TERMS, termsX, summaryY + 7, 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Order Summary', totalsValueX, summaryY, { align: 'right' });

  const totalRows = [
    ['Sub Total:', money(itemSubtotal), 'normal'],
    ...(discountAmount > 0
      ? [
          [`Global Discount (${discountPercentage.toFixed(2)}%):`, `-${money(discountAmount)}`, 'normal'],
          ['Discounted Subtotal:', money(discountedSubtotal), 'normal'],
        ]
      : []),
    ['Shipping:', formatShippingFee(shippingFee), 'normal'],
    [`VAT (${vatRate}):`, money(vatAmount), 'normal'],
    ['Total:', money(order.amount), 'bold'],
  ];

  totalRows.forEach(([label, value, weight], index) => {
    const y = summaryY + 9 + index * 8;
    doc.setFont('helvetica', weight === 'bold' ? 'bold' : 'normal');
    doc.setFontSize(weight === 'bold' ? 11 : 9);
    doc.text(label, totalsLabelX, y, { align: 'right' });
    doc.text(value, totalsValueX, y, { align: 'right' });
  });

  drawFooter(doc, margin, pageWidth, pageHeight);
  doc.save(`elmshelf-invoice-${order.id}.pdf`);
}
