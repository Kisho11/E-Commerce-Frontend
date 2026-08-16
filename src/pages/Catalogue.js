import React, { useEffect, useMemo, useState } from 'react';
import Seo from '../components/Seo';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const API_ORIGIN = API_BASE_URL ? new URL(API_BASE_URL).origin : '';

const resolveCatalogueUrl = (value) => {
  if (!value) return '';
  if (/^https?:/i.test(value)) return value;
  if (!API_ORIGIN) return value;
  if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
};

function Catalogue() {
  const [catalogue, setCatalogue] = useState(null);
  const [loading, setLoading] = useState(Boolean(API_BASE_URL));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!API_BASE_URL) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadCatalogue = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_BASE_URL}/marketing/catalogue`, {
          credentials: 'include',
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.detail || 'Unable to load catalogue.');
        }

        if (!cancelled) {
          setCatalogue(data || null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setCatalogue(null);
          setError(loadError.message || 'Unable to load catalogue.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCatalogue();

    return () => {
      cancelled = true;
    };
  }, []);

  const previewUrl = useMemo(() => resolveCatalogueUrl(catalogue?.file_url || ''), [catalogue]);
  const downloadUrl = API_BASE_URL ? `${API_BASE_URL}/marketing/catalogue/download` : previewUrl;

  return (
    <div className="pb-10">
      <Seo
        title="Catalogue"
        description="Browse Elmshelf catalogues for shelving, refrigeration, slatwall panels, bakery displays, and other retail fit-out products."
      />

      <section className="shell mt-10">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Product Catalogue</p>
              <h1 className="mt-2 text-3xl font-extrabold text-primary sm:text-4xl">Our Catalogue</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Browse our latest product catalogue below, or download the PDF to view shelving,
                displays, counters, and shopfitting solutions offline.
              </p>
            </div>

            {previewUrl ? (
              <div className="flex flex-wrap gap-3">
                <a
                  href={downloadUrl}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Download Catalogue
                </a>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-primary hover:bg-red-50 hover:text-primary"
                >
                  Open Full Catalogue
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="shell mt-6">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-500 shadow-sm">
            Loading catalogue...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : previewUrl ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <iframe
              title={catalogue?.original_filename || 'Elmshelf product catalogue'}
              src={previewUrl}
              className="h-[72vh] min-h-[520px] w-full border-0"
              loading="lazy"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700">
                {catalogue?.original_filename || 'Elmshelf Catalogue'}
              </p>
              <a
                href={downloadUrl}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-primary"
              >
                Download PDF
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Catalogue Coming Soon</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
              Our product catalogue is being updated. Please check back soon, or contact our team for
              product details and recommendations.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Catalogue;
