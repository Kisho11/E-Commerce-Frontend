import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Elmshelf';
const DEFAULT_TITLE = 'Elmshelf | Retail Shelving, Displays & Shop Fittings';
const DEFAULT_DESCRIPTION =
  'Elmshelf supplies retail shelving, display counters, refrigeration, flooring, and shop fittings for stores across the UK.';
const DEFAULT_IMAGE = '/main.webp';

const ensureMetaTag = (selector, attributes) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  return element;
};

const ensureLinkTag = (selector, attributes) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('link');
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  return element;
};

function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  canonicalPath,
  structuredData,
}) {
  const location = useLocation();

  const pageTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;

  const canonicalUrl = useMemo(() => {
    const origin = window.location.origin;
    const targetPath = canonicalPath ?? location.pathname;
    return new URL(targetPath, origin).toString();
  }, [canonicalPath, location.pathname]);

  const imageUrl = useMemo(() => new URL(image, window.location.origin).toString(), [image]);

  const schemaEntries = useMemo(() => {
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: window.location.origin,
      logo: new URL('/elmshelf-logo.png', window.location.origin).toString(),
    };

    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: window.location.origin,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${window.location.origin}/products-by-industry?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };

    const customEntries = structuredData
      ? (Array.isArray(structuredData) ? structuredData : [structuredData])
      : [];

    return [organizationSchema, websiteSchema, ...customEntries];
  }, [structuredData]);

  useEffect(() => {
    document.title = pageTitle;

    ensureMetaTag('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
    ensureMetaTag('meta[name="robots"]', { name: 'robots' }).setAttribute(
      'content',
      noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
    );

    ensureMetaTag('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', pageTitle);
    ensureMetaTag('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
    ensureMetaTag('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', type);
    ensureMetaTag('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', canonicalUrl);
    ensureMetaTag('meta[property="og:image"]', { property: 'og:image' }).setAttribute('content', imageUrl);
    ensureMetaTag('meta[property="og:site_name"]', { property: 'og:site_name' }).setAttribute('content', SITE_NAME);

    ensureMetaTag('meta[name="twitter:card"]', { name: 'twitter:card' }).setAttribute('content', 'summary_large_image');
    ensureMetaTag('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute('content', pageTitle);
    ensureMetaTag('meta[name="twitter:description"]', { name: 'twitter:description' }).setAttribute('content', description);
    ensureMetaTag('meta[name="twitter:image"]', { name: 'twitter:image' }).setAttribute('content', imageUrl);

    ensureLinkTag('link[rel="canonical"]', { rel: 'canonical' }).setAttribute('href', canonicalUrl);

    document.querySelectorAll('script[data-seo-jsonld="true"]').forEach((node) => node.remove());

    schemaEntries.forEach((entry) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoJsonld = 'true';
      script.text = JSON.stringify(entry);
      document.head.appendChild(script);
    });

    return () => {
      document.querySelectorAll('script[data-seo-jsonld="true"]').forEach((node) => node.remove());
    };
  }, [canonicalUrl, description, imageUrl, noindex, pageTitle, schemaEntries, type]);

  return null;
}

export default Seo;
