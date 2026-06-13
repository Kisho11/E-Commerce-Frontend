const MAX_SUMMARY_LENGTH = 180;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const stripHtml = (value = '') =>
  `${value}`
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractTextFromNode = (node) => {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.content)) return node.content.map(extractTextFromNode).join(' ');
  return '';
};

const isValidTipTapDoc = (value) =>
  value &&
  typeof value === 'object' &&
  value.type === 'doc' &&
  Array.isArray(value.content);

// ---------------------------------------------------------------------------
// Migration: old custom-block format → TipTap doc
// ---------------------------------------------------------------------------

const migrateOldBlocks = (blocks, fallbackText) => {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    const text = (fallbackText || '').trim();
    return {
      type: 'doc',
      content: [
        text
          ? { type: 'paragraph', content: [{ type: 'text', text }] }
          : { type: 'paragraph' },
      ],
    };
  }

  const content = blocks.flatMap((block) => {
    if (!block?.type) return [];

    const text = stripHtml(block.html || '');

    if (block.type === 'paragraph') {
      return [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }];
    }
    if (block.type === 'heading') {
      return [{ type: 'heading', attrs: { level: 1 }, content: text ? [{ type: 'text', text }] : [] }];
    }
    if (block.type === 'subheading') {
      return [{ type: 'heading', attrs: { level: 2 }, content: text ? [{ type: 'text', text }] : [] }];
    }
    if (block.type === 'quote') {
      return [{
        type: 'blockquote',
        content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
      }];
    }
    if (block.type === 'bullet-list') {
      return [{
        type: 'bulletList',
        content: (block.items || ['']).map((item) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: item ? [{ type: 'text', text: `${item}` }] : [] }],
        })),
      }];
    }
    if (block.type === 'number-list') {
      return [{
        type: 'orderedList',
        attrs: { start: 1 },
        content: (block.items || ['']).map((item) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: item ? [{ type: 'text', text: `${item}` }] : [] }],
        })),
      }];
    }
    if (block.type === 'table' && Array.isArray(block.headers)) {
      return [{
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: block.headers.map((h) => ({
              type: 'tableHeader',
              attrs: { colspan: 1, rowspan: 1, colwidth: null },
              content: [{ type: 'paragraph', content: h ? [{ type: 'text', text: `${h}` }] : [] }],
            })),
          },
          ...(block.rows || []).map((row) => ({
            type: 'tableRow',
            content: (Array.isArray(row) ? row : []).map((cell) => ({
              type: 'tableCell',
              attrs: { colspan: 1, rowspan: 1, colwidth: null },
              content: [{ type: 'paragraph', content: cell ? [{ type: 'text', text: `${cell}` }] : [] }],
            })),
          })),
        ],
      }];
    }
    return [];
  });

  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const createDefaultProductContent = () => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

export const normalizeProductContent = (value, fallbackText = '') => {
  // Already a valid TipTap doc
  if (isValidTipTapDoc(value)) return value;

  // Old custom-block format → migrate
  if (value && typeof value === 'object' && Array.isArray(value.blocks)) {
    return migrateOldBlocks(value.blocks, fallbackText);
  }

  // JSON string returned from a TEXT column — try to parse before treating as plain text
  if (typeof value === 'string' && value.trimStart().startsWith('{')) {
    try {
      const parsed = JSON.parse(value);
      if (isValidTipTapDoc(parsed)) return parsed;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.blocks)) {
        return migrateOldBlocks(parsed.blocks, fallbackText);
      }
    } catch (_) {
      // not valid JSON — fall through to plain-text path
    }
  }

  // Plain string (e.g. legacy product.description from the backend)
  const text = (typeof value === 'string' ? value : (fallbackText || '')).trim();
  if (text) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    };
  }

  return createDefaultProductContent();
};

export const extractProductContentPlainText = (content) => {
  const normalized = normalizeProductContent(content);
  return extractTextFromNode(normalized).replace(/\s+/g, ' ').trim();
};

export const isProductContentEmpty = (content) =>
  !extractProductContentPlainText(content);

export const summarizeProductContent = (content, fallbackText = '') => {
  const text = extractProductContentPlainText(content) || `${fallbackText || ''}`.trim();
  if (!text) return '';
  return text.length <= MAX_SUMMARY_LENGTH ? text : `${text.slice(0, MAX_SUMMARY_LENGTH).trimEnd()}...`;
};
