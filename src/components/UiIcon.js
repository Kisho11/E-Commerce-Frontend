import React from 'react';

const iconPaths = {
  check: (
    <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
  ),
  alert: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 3.9 1.8 18.4A1.2 1.2 0 0 0 2.8 20h18.4a1.2 1.2 0 0 0 1-1.6L13.7 3.9a1.2 1.2 0 0 0-2.4 0Z" />
    </>
  ),
  box: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V16.5L12 21l9-4.5V7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v9" />
    </>
  ),
  payment: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 15h4" />
    </>
  ),
  truck: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 4h13v10H1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 8h4l3 3v3h-7V8Z" />
      <circle cx="5" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  userShield: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20a8 8 0 0 1 16 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m18 10 4 2v3c0 2.5-1.6 4.8-4 5.6-2.4-.8-4-3.1-4-5.6v-3l4-2Z" />
    </>
  ),
  userCog: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 20a7.5 7.5 0 0 1 15 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11.5v3m-1.5-1.5h3" />
      <circle cx="19" cy="13" r="4" />
    </>
  ),
  list: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4" cy="6" r="1.2" />
      <circle cx="4" cy="12" r="1.2" />
      <circle cx="4" cy="18" r="1.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
    </>
  ),
  users: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 19a5.5 5.5 0 0 1 11 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 19a4.5 4.5 0 0 1 9 0" />
    </>
  ),
  chart: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m6 14V9m6 10V3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 19h20" />
    </>
  ),
  currency: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 3 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />
    </>
  ),
  star: (
    <path strokeLinecap="round" strokeLinejoin="round" d="m12 3.5 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.7 6.6 20.3l1-6.1L3.2 9.9l6.1-.9L12 3.5Z" />
  ),
  tasks: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h11M9 12h11M9 18h11" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 6 1.5 1.5L7 5.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 12 1.5 1.5L7 11.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 18 1.5 1.5L7 17.5" />
    </>
  ),
  edit: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 17.25 9.9-9.9 3.75 3.75-9.9 9.9L3 21l.25-3.75Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.5 5.75 3.75 3.75" />
    </>
  ),
  trash: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l1 13h8l1-13" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7h.01" />
    </>
  ),
  save: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h13l3 3v13H4V4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v6h8V4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 20v-6h8v6" />
    </>
  ),
  folder: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  ),
  folderOpen: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 0 1 2-2h4l2 2h9l-2 8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
  ),
  ellipsis: (
    <>
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v6l3.5 2" />
    </>
  ),
  bold: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5h5a3 3 0 0 1 0 6H8V5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11h6a3.5 3.5 0 1 1 0 7H8v-7Z" />
    </>
  ),
  italic: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 19h4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5 10 19" />
    </>
  ),
  underline: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v6a4 4 0 1 0 8 0V5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 19h12" />
    </>
  ),
  link: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14 8 16a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l2-2a3 3 0 1 1 4 4l-3 3a3 3 0 0 1-4 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l6-6" />
    </>
  ),
  paragraph: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h9a4 4 0 0 1 0 8h-3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v13" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19h6" />
    </>
  ),
  heading: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 6v12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8h3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 8v10" />
    </>
  ),
  subheading: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7v10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 7v10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15h4" />
    </>
  ),
  orderedList: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 7h10M10 12h10M10 17h10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h1v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 13.5c.3-.8 1.4-1.5 2.3-1 .7.3.7 1.2.1 1.7L4 16h2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.8 18.2c.5-.5 1.5-.8 2.2-.4.8.4.9 1.4.1 1.9-.8.5-1.8.3-2.4-.2" />
    </>
  ),
  quote: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 10H5.8A1.8 1.8 0 0 0 4 11.8V14a2 2 0 0 0 2 2h1v3l3-3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 10h-2.7a1.8 1.8 0 0 0-1.8 1.8V14a2 2 0 0 0 2 2h1v3l3-3" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 16-4.5-4.5L8 20" />
    </>
  ),
  arrowUp: (
    <path strokeLinecap="round" strokeLinejoin="round" d="m12 5-5 5m5-5 5 5M12 5v14" />
  ),
  arrowDown: (
    <path strokeLinecap="round" strokeLinejoin="round" d="m12 19 5-5m-5 5-5-5m5 5V5" />
  ),
  plus: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </>
  ),
  warehouse: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5 12 4l9 5.5V20H3V9.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20v-6h6v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h18" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5v14M15 5v14" />
    </>
  ),
};

function UiIcon({ name, className = 'h-5 w-5', strokeWidth = 2 }) {
  const paths = iconPaths[name];
  if (!paths) return null;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
      {paths}
    </svg>
  );
}

export default UiIcon;
