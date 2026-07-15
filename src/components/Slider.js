import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const stableSlide = {
  backgroundImage: 'url(/main.webp)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};

function Slider() {
  const { t } = useLanguage();

  return (
    <section className="fade-up">
      <div className="relative min-h-[36rem] w-full overflow-hidden bg-slate-900 shadow-2xl sm:min-h-[40rem] lg:h-[calc(100vh-4rem)] lg:min-h-[42rem]">
        <article className="absolute inset-0">
          <div
            className="hero-pan absolute inset-0"
            style={{
              backgroundImage: stableSlide.backgroundImage,
              backgroundSize: stableSlide.backgroundSize || 'auto',
              backgroundPosition: stableSlide.backgroundPosition || 'center',
              backgroundRepeat: stableSlide.backgroundRepeat || 'no-repeat',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 to-slate-900/45" />
          <div className="relative flex h-full items-center px-4 py-12 sm:px-8 sm:py-16 lg:px-14 lg:py-20">
            <div className="max-w-2xl text-white">
              <p className="mb-3 inline-flex rounded-full border border-white/30 bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] sm:mb-4 sm:px-4 sm:text-xs">
                {t('slider.eyebrow')}
              </p>
              <h1 className="mb-4 text-[2rem] font-bold leading-tight sm:mb-5 sm:text-4xl lg:text-5xl">
                {[t('slider.line1'), t('slider.line2'), t('slider.line3')].map((line) => (
                  <span key={line} className="mb-1 block w-fit border-b-[3px] border-primary pb-1 sm:border-b-4">
                    {line}
                  </span>
                ))}
              </h1>
              <p className="mb-6 max-w-xl text-sm leading-7 text-slate-100 sm:mb-8 sm:text-base lg:text-lg">{t('slider.subtitle')}</p>
              <a
                href="tel:+447584682048"
                className="phone-glow mb-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-extrabold tracking-[0.04em] text-white shadow-xl sm:mb-6 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M6.62 10.79a15.06 15.06 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.56 0 1 .45 1 1V20a1 1 0 0 1-1 1C10.85 21 3 13.15 3 3a1 1 0 0 1 1-1h3.5c.55 0 1 .44 1 1 0 1.24.2 2.45.57 3.57.11.35.03.75-.25 1.02l-2.2 2.2Z" />
                </svg>
                {t('slider.call')}
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default Slider;
