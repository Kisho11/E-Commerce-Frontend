import React from 'react';

const BUSINESS_PHONE = '+447584682048';
const WHATSAPP_PHONE = '447584682048';
const WHATSAPP_MESSAGE = 'Hi, I need help with a product enquiry.';

function QuickContactActions() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-3 sm:bottom-8 sm:right-6">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
          <path d="M19.05 4.91A9.82 9.82 0 0 0 12.03 2C6.63 2 2.23 6.39 2.23 11.8c0 1.73.45 3.42 1.3 4.9L2 22l5.48-1.44a9.77 9.77 0 0 0 4.55 1.16h.01c5.4 0 9.8-4.4 9.8-9.8 0-2.62-1.02-5.08-2.8-6.99Zm-7.01 15.2h-.01a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.25.85.87-3.17-.2-.33a8.16 8.16 0 0 1-1.26-4.33c0-4.5 3.67-8.17 8.19-8.17 2.19 0 4.25.85 5.8 2.4a8.12 8.12 0 0 1 2.4 5.78c0 4.52-3.67 8.19-8.18 8.19Zm4.49-6.13c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.19-.7-.62-1.17-1.39-1.31-1.63-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.43h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.11 3.64.57.25 1.02.4 1.37.51.58.18 1.11.15 1.53.09.47-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
        </svg>
      </a>

      <a
        href={`tel:${BUSINESS_PHONE}`}
        aria-label="Call us now"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:scale-105 hover:bg-red-700 hover:shadow-xl"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
          <path d="M6.62 10.79a15.06 15.06 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.56 0 1 .45 1 1V20a1 1 0 0 1-1 1C10.85 21 3 13.15 3 3a1 1 0 0 1 1-1h3.5c.55 0 1 .44 1 1 0 1.24.2 2.45.57 3.57.11.35.03.75-.25 1.02l-2.2 2.2Z" />
        </svg>
      </a>
    </div>
  );
}

export default QuickContactActions;
