const API_BASE_URL = process.env.REACT_APP_API_URL;

const VISITOR_ID_KEY = 'elmshelf_visitor_id';
const SESSION_ID_KEY = 'elmshelf_session_id';

let memoryVisitorId = '';
let memorySessionId = '';

const createId = (prefix) => {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomPart}`;
};

const readStoredId = (storage, key) => {
  try {
    return storage.getItem(key) || '';
  } catch (error) {
    return '';
  }
};

const writeStoredId = (storage, key, value) => {
  try {
    storage.setItem(key, value);
  } catch (error) {
    // Analytics should never block the shopping experience.
  }
};

export const getAnalyticsIdentity = () => {
  if (typeof window === 'undefined') {
    return { visitorId: '', sessionId: '' };
  }

  let visitorId = readStoredId(window.localStorage, VISITOR_ID_KEY) || memoryVisitorId;
  if (!visitorId) {
    visitorId = createId('visitor');
    memoryVisitorId = visitorId;
    writeStoredId(window.localStorage, VISITOR_ID_KEY, visitorId);
  }

  let sessionId = readStoredId(window.sessionStorage, SESSION_ID_KEY) || memorySessionId;
  if (!sessionId) {
    sessionId = createId('session');
    memorySessionId = sessionId;
    writeStoredId(window.sessionStorage, SESSION_ID_KEY, sessionId);
  }

  return { visitorId, sessionId };
};

const postAnalyticsEvent = (path, payload) => {
  if (!API_BASE_URL) return;

  fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'omit',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
};

export const recordSiteVisit = (path) => {
  const { visitorId, sessionId } = getAnalyticsIdentity();
  if (!visitorId || !sessionId) return;

  postAnalyticsEvent('/analytics/visit', {
    visitor_id: visitorId,
    session_id: sessionId,
    path: path || '/',
  });
};

export const recordProductView = (productId) => {
  const numericProductId = Number(productId);
  if (!Number.isFinite(numericProductId) || numericProductId <= 0) return;

  const { visitorId, sessionId } = getAnalyticsIdentity();
  if (!visitorId || !sessionId) return;

  postAnalyticsEvent('/analytics/product-view', {
    product_id: numericProductId,
    visitor_id: visitorId,
    session_id: sessionId,
  });
};
