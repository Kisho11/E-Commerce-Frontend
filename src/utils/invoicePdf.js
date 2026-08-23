import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatShippingFee } from './shipping';
import {
  BANK_DETAILS,
  BUSINESS,
  TERMS,
  VAT_NUMBER,
  buildInvoicePages,
  formatDateTime,
  formatVariant,
  getAddressLines,
  getCustomerName,
  getItemSubtotal,
} from './invoiceLayout';
const PAGE_MARGIN = 18;
const FOOTER_LINE_FROM_BOTTOM = 22;
const FOOTER_TEXT_FROM_BOTTOM = 12;
const FOOTER_SAFE_GAP = 8;
const SUMMARY_GAP = 12;

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

const writeLines = (doc, lines, x, y, lineHeight = 5) => {
  lines.filter(Boolean).forEach((line, index) => {
    doc.text(String(line), x, y + index * lineHeight);
  });
  return y + lines.filter(Boolean).length * lineHeight;
};

const drawFooter = (doc, margin, pageWidth, pageHeight) => {
  const footerLineY = pageHeight - FOOTER_LINE_FROM_BOTTOM;

  doc.setDrawColor(221, 221, 221);
  doc.line(margin, footerLineY, pageWidth - margin, footerLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(41, 41, 41);
  doc.text(BANK_DETAILS, pageWidth / 2, pageHeight - FOOTER_TEXT_FROM_BOTTOM, { align: 'center' });
};

const drawFooters = (doc, margin, pageWidth, pageHeight) => {
  const pageCount = doc.internal.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    drawFooter(doc, margin, pageWidth, pageHeight);
  }
};

const getSummaryHeight = (totalRows) => {
  const totalsHeight = 9 + Math.max(totalRows.length - 1, 0) * 8 + 6;
  const termsHeight = 7 + TERMS.length * 4.5;

  return Math.max(totalsHeight, termsHeight);
};

const drawIntro = (doc, order, logoDataUrl, margin, pageWidth) => {
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
};

const drawItemsTable = (doc, pageItems, startY, margin, tableBottomMargin) => {
  const tableRows = pageItems.map(({ item, itemNumber }) => {
    const variant = formatVariant(item);
    const description = [item.name || '-', variant].filter(Boolean).join('\n');

    return [
      String(itemNumber),
      description,
      String(item.quantity || 0),
      money(item.price),
      money((Number(item.price) || 0) * (Number(item.quantity) || 0)),
    ];
  });

  autoTable(doc, {
    startY,
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
    margin: { top: margin, right: margin, bottom: tableBottomMargin, left: margin },
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    showHead: 'firstPage',
  });
};

const buildTotalRows = ({
  itemSubtotal,
  discountAmount,
  discountPercentage,
  discountedSubtotal,
  shippingFee,
  vatRate,
  vatAmount,
  amount,
}) => [
  ['Sub Total:', money(itemSubtotal), 'normal'],
  ...(discountAmount > 0
    ? [
        [`Global Discount (${discountPercentage.toFixed(2)}%):`, `-${money(discountAmount)}`, 'normal'],
        ['Discounted Subtotal:', money(discountedSubtotal), 'normal'],
      ]
    : []),
  ['Shipping:', formatShippingFee(shippingFee), 'normal'],
  [`VAT (${vatRate}):`, money(vatAmount), 'normal'],
  ['Total:', money(amount), 'bold'],
];

const drawSummary = (doc, totalRows, summaryY, margin, pageWidth) => {
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

  totalRows.forEach(([label, value, weight], index) => {
    const y = summaryY + 9 + index * 8;
    doc.setFont('helvetica', weight === 'bold' ? 'bold' : 'normal');
    doc.setFontSize(weight === 'bold' ? 11 : 9);
    doc.text(label, totalsLabelX, y, { align: 'right' });
    doc.text(value, totalsValueX, y, { align: 'right' });
  });
};

export async function downloadInvoicePdf(order) {
  if (!order) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PAGE_MARGIN;
  const contentBottomY = pageHeight - FOOTER_LINE_FROM_BOTTOM - FOOTER_SAFE_GAP;
  const tableBottomMargin = pageHeight - contentBottomY;
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

  const totalRows = buildTotalRows({
    itemSubtotal,
    discountAmount,
    discountPercentage,
    discountedSubtotal,
    shippingFee,
    vatRate,
    vatAmount,
    amount: order.amount,
  });
  const summaryHeight = getSummaryHeight(totalRows);
  const pages = buildInvoicePages(order.items);

  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage();
    }

    if (page.showIntro) {
      drawIntro(doc, order, logoDataUrl, margin, pageWidth);
    }

    const shouldDrawTable = page.items.length > 0 || (page.showIntro && !(order.items || []).length);
    const startY = page.showIntro ? 128 : margin;

    if (shouldDrawTable) {
      drawItemsTable(doc, page.items, startY, margin, tableBottomMargin);
    }

    if (page.showSummary) {
      const tableEndY = shouldDrawTable ? (doc.lastAutoTable?.finalY || startY) : margin - SUMMARY_GAP;
      const bottomAnchoredSummaryY = Math.max(margin, contentBottomY - summaryHeight);
      const summaryY = tableEndY + SUMMARY_GAP <= bottomAnchoredSummaryY
        ? bottomAnchoredSummaryY
        : tableEndY + SUMMARY_GAP;

      drawSummary(doc, totalRows, summaryY, margin, pageWidth);
    }
  });

  drawFooters(doc, margin, pageWidth, pageHeight);
  doc.save(`elmshelf-invoice-${order.id}.pdf`);
}
