import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

function AdvertPopup() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = () => setIsVisible(false);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl md:grid md:grid-cols-[0.9fr_1.1fr]">
        <img
          src="/sales.webp"
          alt="Retail shelving advert"
          className="hidden h-full min-h-[280px] w-full object-cover md:block"
        />
        <div className="relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 rounded-full bg-slate-100 p-2 transition hover:bg-slate-200"
            aria-label={t('advert.close')}
          >
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13 2 2 13M2 2l11 11"
                stroke="#1F2937"
                strokeOpacity=".7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="px-5 py-8 pr-12 text-left sm:px-6 md:px-7 md:py-9 md:pr-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t('advert.badge')}</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-slate-900 md:text-3xl">
              <span className="text-primary">{t('advert.titleAccent')}</span> {t('advert.title')}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t('advert.desc')}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                to="/catalogue"
                onClick={handleClose}
                className="inline-flex justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                {t('advert.primaryCta')}
              </Link>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex justify-center px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-primary"
              >
                {t('advert.secondaryCta')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvertPopup;
