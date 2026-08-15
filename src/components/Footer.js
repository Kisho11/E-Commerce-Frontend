import React from 'react';
import { Link } from 'react-router-dom';
import NewsletterSignupForm from './NewsletterSignupForm';
import { useLanguage } from '../context/LanguageContext';
import {
  CALL_PHONE_DISPLAY,
  CALL_PHONE_TEL,
  WHATSAPP_MESSAGE,
  WHATSAPP_PHONE_DISPLAY,
  WHATSAPP_PHONE_WA,
} from '../utils/contactDetails';

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/elmshelf?utm_source=qr&igsh=MXB0bnZiNmpycXl5Yw==',
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="16.8" cy="7.2" r="0.8" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@elm.shelf3?_r=1&_t=ZG-98HMUamVZR2',
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 4v10.2a4 4 0 1 1-4-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 4c.8 3.1 2.5 4.8 5 5" />
      </>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/share/1E6mzNzJBC/',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 8h2V4h-2.6C10.8 4 9 5.8 9 8.4V11H7v4h2v5h4v-5h2.6l.4-4h-3V8.8c0-.5.4-.8 1-.8Z" />
    ),
  },
];

const deliveryPartners = [
  {
    name: 'DPD',
    logo: '/delivery-partners/dpd.png',
    href: null,
  },
  {
    name: 'KS Logistics Solutions',
    logo: '/delivery-partners/ks-logistics-solutions.png',
    href: 'https://kslogisticssolutions.co.uk/',
  },
  {
    name: 'Palletforce',
    logo: '/delivery-partners/palletforce.png',
    href: null,
  },
];

function Footer() {
  const { t } = useLanguage();
  const mapUrl = 'https://www.google.com/maps/search/?api=1&query=Elmshelf%2C%203%20Langley%20Cl%2C%20Romford%20RM3%208XB';
  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE_WA}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  const openCookieSettings = () => {
    window.dispatchEvent(new Event('open-cookie-settings'));
  };

  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-950 text-slate-200">
      <div className="shell py-12">
        <div className="mb-10 border-b border-slate-800 pb-8">
          <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-300">Our Delivery Partners</h4>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {deliveryPartners.map((partner) => {
              const content = (
                <>
                  <span className="flex h-16 w-full items-center justify-center rounded-md bg-white p-3">
                    {partner.logo ? (
                      <img
                        src={partner.logo}
                        alt={`${partner.name} logo`}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-lg font-extrabold text-slate-700">{partner.name}</span>
                    )}
                  </span>
                  <span className="mt-2 block text-sm font-semibold text-slate-300">{partner.name}</span>
                </>
              );

              if (partner.href) {
                return (
                  <a
                    key={partner.name}
                    href={partner.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${partner.name}`}
                    className="block rounded-md border border-slate-800 bg-slate-900/70 p-3 text-center transition hover:border-slate-600 hover:bg-slate-900 hover:text-white"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <div
                  key={partner.name}
                  className="rounded-md border border-slate-800 bg-slate-900/70 p-3 text-center"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-10 border-b border-slate-800 pb-8">
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-300">Email Updates</p>
              <h3 className="mt-2 text-2xl font-bold text-white">Stay in the loop</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Get promotions, offers, and event details from Elmshelf.
              </p>
            </div>
            <NewsletterSignupForm variant="dark" compact />
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-300">{t('footer.brandName')}</p>
            <h3 className="mt-2 text-2xl font-bold text-white">{t('footer.title')}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {t('footer.desc')}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-300">{t('footer.explore')}</h4>
            <div className="mt-4 space-y-2 text-sm">
              <Link to="/" className="block text-slate-400 transition hover:text-white">{t('nav.home')}</Link>
              <Link to="/showroom" className="block text-slate-400 transition hover:text-white">{t('nav.showroom')}</Link>
              <Link to="/products-by-industry" className="block text-slate-400 transition hover:text-white">{t('productsPage.title')}</Link>
              <Link to="/catalogue" className="block text-slate-400 transition hover:text-white">{t('nav.catalogue')}</Link>
              <Link to="/customer-portal" className="block text-slate-400 transition hover:text-white">{t('nav.myAccount')}</Link>
            </div>
          </div>

          <div className="lg:-ml-4 xl:-ml-6">
            <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-300">Visit Us</h4>
            <div className="mt-4 space-y-4">
              <div className="flex w-full items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-red-300">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.2" />
                  </svg>
                </span>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Elmshelf location in Google Maps"
                  className="flex-1 text-left text-lg font-bold leading-relaxed text-white no-underline transition hover:text-red-300 hover:no-underline"
                >
                  Elmshelf, 3 Langley Cl, Romford RM3 8XB
                </a>
              </div>

              <div className="flex w-full items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-red-300">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                  </svg>
                </span>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Opening Hours</p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-white">
                    Monday-Saturday: 8:00 AM - 7:00 PM
                  </p>
                  <p className="text-sm font-semibold leading-relaxed text-slate-300">
                    Sunday: 9:00 AM - 5:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-300">Contact</h4>
            <div className="mt-4 space-y-4">
              <div className="flex w-full items-center gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-red-300">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M6.62 10.79a15.06 15.06 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.56 0 1 .45 1 1V20a1 1 0 0 1-1 1C10.85 21 3 13.15 3 3a1 1 0 0 1 1-1h3.5c.55 0 1 .44 1 1 0 1.24.2 2.45.57 3.57.11.35.03.75-.25 1.02l-2.2 2.2Z" />
                  </svg>
                </span>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Call</p>
                  <a href={`tel:${CALL_PHONE_TEL}`} className="text-2xl font-extrabold text-primary no-underline transition hover:text-red-400 hover:no-underline sm:text-3xl">
                    {CALL_PHONE_DISPLAY}
                  </a>
                </div>
              </div>

              <div className="flex w-full items-center gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[#25D366]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M19.05 4.91A9.82 9.82 0 0 0 12.03 2C6.63 2 2.23 6.39 2.23 11.8c0 1.73.45 3.42 1.3 4.9L2 22l5.48-1.44a9.77 9.77 0 0 0 4.55 1.16h.01c5.4 0 9.8-4.4 9.8-9.8 0-2.62-1.02-5.08-2.8-6.99Zm-7.01 15.2h-.01a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.25.85.87-3.17-.2-.33a8.16 8.16 0 0 1-1.26-4.33c0-4.5 3.67-8.17 8.19-8.17 2.19 0 4.25.85 5.8 2.4a8.12 8.12 0 0 1 2.4 5.78c0 4.52-3.67 8.19-8.18 8.19Zm4.49-6.13c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.19-.7-.62-1.17-1.39-1.31-1.63-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.43h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.11 3.64.57.25 1.02.4 1.37.51.58.18 1.11.15 1.53.09.47-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
                  </svg>
                </span>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">WhatsApp</p>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-xl font-extrabold text-[#25D366] no-underline transition hover:text-green-300 hover:no-underline sm:text-2xl">
                    {WHATSAPP_PHONE_DISPLAY}
                  </a>
                </div>
              </div>

              <div className="flex w-full items-center gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Follow us</p>
                <div className="flex items-center gap-2">
                  {socialLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Follow Elmshelf on ${item.label}`}
                      title={item.label}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-red-300 transition hover:bg-red-600 hover:text-white"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        {item.icon}
                      </svg>
                    </a>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-sm text-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              &copy; 2026 Elmshelf. All rights reserved.
              <span className="ml-2">
                Powered by{' '}
                <a
                  href="https://hexvels.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary transition hover:text-red-400"
                >
                  Hexvels
                </a>
              </span>
            </p>
            <button
              type="button"
              onClick={openCookieSettings}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              {t('footer.cookieSettings')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
