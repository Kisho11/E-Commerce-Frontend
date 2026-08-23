import React, { useEffect, useState } from 'react';
import Seo from '../components/Seo';
import {
  CALL_PHONE_DISPLAY,
  CALL_PHONE_TEL,
} from '../utils/contactDetails';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const API_ORIGIN = API_BASE_URL ? new URL(API_BASE_URL).origin : '';
const showroomAddress = 'Elmshelf, 3 Langley Cl, Romford RM3 8XB';
const encodedAddress = encodeURIComponent(showroomAddress);
const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
const mapEmbedUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;

const resolveShowroomImageUrl = (value) => {
  if (!value) return '';
  if (/^(data:|blob:|https?:)/i.test(value)) return value;
  if (!API_ORIGIN) return value;
  if (value.startsWith('/uploads/')) return `${API_ORIGIN}${value}`;
  return value;
};

const visitSteps = [
  {
    title: 'Bring Your Measurements',
    description: 'Share rough wall lengths, aisle widths, or a store plan so our team can guide you faster.',
  },
  {
    title: 'Compare Real Finishes',
    description: 'Check colours, materials, shelf depths, counter styles, and display options before ordering.',
  },
  {
    title: 'Plan The Next Step',
    description: 'Leave with clearer product choices, delivery guidance, and a quote direction for your project.',
  },
];

function Showroom() {
  const [showroomImageUrl, setShowroomImageUrl] = useState('');

  useEffect(() => {
    if (!API_BASE_URL) return undefined;

    let cancelled = false;

    const loadShowroomImage = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/marketing/settings`, {
          credentials: 'include',
        });
        const data = await response.json().catch(() => null);

        if (!cancelled && response.ok) {
          setShowroomImageUrl(resolveShowroomImageUrl(data?.showroom_image_url));
        }
      } catch (error) {
        if (!cancelled) {
          setShowroomImageUrl('');
        }
      }
    };

    loadShowroomImage();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pb-10">
      <Seo
        title="Showroom"
        description="Visit the Elmshelf showroom in Romford to compare retail shelving, display counters, flooring, wall bays, and shopfitting solutions in person."
      />

      <section className="shell mt-10">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white shadow-xl">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-6 sm:p-10 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">Romford Showroom</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
                Our Extensive Showroom
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
                Visit Elmshelf to see retail shelving, display counters, wall bays, flooring, panels, and
                shopfitting solutions in person before you order.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Get Directions
                </a>
                <a
                  href={`tel:${CALL_PHONE_TEL}`}
                  className="inline-flex items-center justify-center rounded-full border border-slate-500 px-6 py-3 text-sm font-bold text-slate-100 transition hover:border-red-300 hover:text-red-200"
                >
                  Call {CALL_PHONE_DISPLAY}
                </a>
              </div>
            </div>

            <div
              className="min-h-[260px] bg-cover bg-center sm:min-h-[340px] lg:min-h-full"
              style={{ backgroundImage: showroomImageUrl ? `url(${showroomImageUrl})` : 'none' }}
              aria-label="Elmshelf showroom storefront"
              role="img"
            />
          </div>
        </div>
      </section>

      <section className="shell mt-8">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Visit Us</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Plan Your Showroom Visit</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Walk through real shopfitting setups, compare product finishes, and speak with our team about the
              best layout for your store.
            </p>

            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-primary">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.2" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Showroom Address</p>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-base font-semibold leading-relaxed text-primary hover:text-red-700"
                  >
                    {showroomAddress}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-primary">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Opening Hours</p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">
                    Monday-Saturday: 8:00 AM - 7:00 PM
                  </p>
                  <p className="text-sm font-semibold leading-relaxed text-slate-700">
                    Sunday: 9:00 AM - 5:00 PM
                  </p>
                </div>
              </div>
            </div>

          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <iframe
              title="Elmshelf showroom location map"
              src={mapEmbedUrl}
              className="h-[360px] w-full border-0 sm:h-[430px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700">Pinpoint Elmshelf in Romford.</p>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-primary"
              >
                Open In Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="shell mt-8">
        <div className="rounded-lg bg-slate-900 p-6 text-white sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-300">Make The Visit Count</p>
              <h2 className="mt-2 text-3xl font-extrabold">Arrive With An Idea. Leave With A Plan.</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Whether you are opening a new shop or upgrading an existing space, a showroom visit helps you
                choose products with more confidence.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {visitSteps.map((step) => (
                <article key={step.title} className="rounded-lg border border-slate-700 bg-slate-800/70 p-5">
                  <h3 className="text-base font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Showroom;
