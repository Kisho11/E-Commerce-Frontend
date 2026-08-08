import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BUSINESS = {
  name: 'Elmshelf',
  address: '3, Langley Close, Romford, RM3 8XB',
  phone: '+44 7584682048',
  hoursWeekday: 'Monday-Saturday: 8:00 AM - 7:00 PM',
  hoursSunday: 'Sunday: 9:00 AM - 5:00 PM',
};

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

const formatDeliveryMode = (value = '') => {
  if (value === 'ship') return 'Ship to address';
  if (value === 'pickup') return 'Pickup from store';
  return value || '-';
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
  ].filter(Boolean).join(' | ') || '-';
};

const getDeliveryNote = (order) => {
  const note = (order.notes || order.deliveryNote || '').trim();
  const duplicateDeliveryMode = `Delivery mode: ${formatDeliveryMode(order.deliveryMode)}`.toLowerCase();
  return note.toLowerCase() === duplicateDeliveryMode ? '' : note;
};

const writeLines = (doc, lines, x, y, lineHeight = 5) => {
  lines.filter(Boolean).forEach((line, index) => {
    doc.text(String(line), x, y + index * lineHeight);
  });
  return y + lines.filter(Boolean).length * lineHeight;
};

export async function downloadInvoicePdf(order) {
  if (!order) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const pricing = order.pricing || {};
  const subtotal = pricing.subtotal ?? order.amount;
  const discountPercentage = Number(pricing.discountPercentage || 0);
  const discountAmount = Number(pricing.discountAmount || 0);
  const discountedSubtotal = Number(pricing.discountedSubtotal ?? Math.max(Number(subtotal || 0) - discountAmount, 0));
  const taxRate = `${((Number(pricing.taxRate) || 0) * 100).toFixed(2)}%`;
  const deliveryNote = getDeliveryNote(order);

  doc.setProperties({
    title: `Elmshelf Invoice #${order.id}`,
    subject: `Invoice for order #${order.id}`,
    author: BUSINESS.name,
  });

  const logoDataUrl = await imageToDataUrl('/elms.png');

  doc.setFillColor(249, 250, 251);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setTextColor(15, 23, 42);
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', margin, 8, 22, 22);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(BUSINESS.name, logoDataUrl ? margin + 28 : margin, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(BUSINESS.address, logoDataUrl ? margin + 28 : margin, 25);
  doc.text(BUSINESS.phone, logoDataUrl ? margin + 28 : margin, 31);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INVOICE', pageWidth - margin, 16, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${order.id}`, pageWidth - margin, 23, { align: 'right' });
  doc.text(`Placed: ${formatDateTime(order)}`, pageWidth - margin, 29, { align: 'right' });
  doc.text(`Status: ${order.status || '-'}`, pageWidth - margin, 35, { align: 'right' });

  const sectionTop = 50;
  const colWidth = (pageWidth - margin * 2 - 8) / 3;
  const sections = [
    {
      title: 'Bill To',
      x: margin,
      lines: [
        getCustomerName(order),
        order.customerEmail || '',
        order.customerPhone || '',
      ],
    },
    {
      title: 'Delivery',
      x: margin + colWidth + 4,
      lines: [
        formatDeliveryMode(order.deliveryMode),
        order.shippingAddress?.address || '-',
        [order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.zipCode].filter(Boolean).join(', ') || '-',
      ],
    },
    {
      title: 'Payment',
      x: margin + (colWidth + 4) * 2,
      lines: [
        `Method: ${order.payment?.method || '-'}`,
        order.payment?.cardLast4 ? `Card: **** ${order.payment.cardLast4}` : '',
        `Total: ${money(order.amount)}`,
      ],
    },
  ];

  sections.forEach((section) => {
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(section.x, sectionTop - 6, colWidth, 34, 2, 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(section.title.toUpperCase(), section.x + 4, sectionTop);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    writeLines(doc, section.lines, section.x + 4, sectionTop + 7, 5);
  });

  const tableRows = (order.items || []).map((item) => [
    item.name || '-',
    formatVariant(item),
    String(item.quantity || 0),
    money(item.price),
    money((Number(item.price) || 0) * (Number(item.quantity) || 0)),
  ]);

  autoTable(doc, {
    startY: sectionTop + 42,
    head: [['Product', 'Variant', 'Qty', 'Unit Price', 'Line Total']],
    body: tableRows.length > 0 ? tableRows : [['No items found', '-', '-', '-', '-']],
    styles: { fontSize: 9, cellPadding: 2.6, valign: 'middle' },
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 48 },
      2: { halign: 'right', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
    },
    margin: { left: margin, right: margin },
  });

  const afterTableY = doc.lastAutoTable.finalY + 10;
  const totalsX = pageWidth - margin - 68;
  const totalRows = [
    ['Subtotal', money(subtotal)],
    ...(discountAmount > 0
      ? [
          [`Global Discount (${discountPercentage.toFixed(2)}%)`, `-${money(discountAmount)}`],
          ['Discounted Subtotal', money(discountedSubtotal)],
        ]
      : []),
    [`Tax (${taxRate})`, money(pricing.taxAmount)],
    ['Shipping', money(pricing.shippingFee)],
  ];
  const totalsBoxHeight = 18 + totalRows.length * 7;

  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(totalsX, afterTableY - 4, 68, totalsBoxHeight, 2, 2);
  doc.setFontSize(9);
  totalRows.forEach(([label, value], index) => {
    const y = afterTableY + index * 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(label, totalsX + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(value, pageWidth - margin - 4, y, { align: 'right' });
  });

  doc.setDrawColor(203, 213, 225);
  const totalDividerY = afterTableY + totalRows.length * 7;
  doc.line(totalsX + 4, totalDividerY, pageWidth - margin - 4, totalDividerY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total', totalsX + 4, totalDividerY + 9);
  doc.text(money(order.amount), pageWidth - margin - 4, totalDividerY + 9, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('STORE HOURS', margin, afterTableY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  writeLines(doc, [BUSINESS.hoursWeekday, BUSINESS.hoursSunday], margin, afterTableY + 7, 5);

  if (deliveryNote) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('DELIVERY NOTES', margin, afterTableY + 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(doc.splitTextToSize(deliveryNote, 100), margin, afterTableY + 31);
  }

  const footerY = doc.internal.pageSize.getHeight() - 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 7, pageWidth - margin, footerY - 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Thank you for choosing ${BUSINESS.name}.`, pageWidth / 2, footerY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Please keep this invoice for your records.', pageWidth / 2, footerY + 5, { align: 'center' });

  doc.save(`elmshelf-invoice-${order.id}.pdf`);
}
