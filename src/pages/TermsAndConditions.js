import React, { useEffect, useMemo, useState } from 'react';
import Seo from '../components/Seo';

const normalizeTermsText = (value = '') => {
  let text = value.trim();

  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1);
  }

  return text
    .replace(/""/g, '"')
    .replace(/Â£/g, '\u00a3')
    .replace(/â€“/g, '-')
    .replace(/â€”/g, '-')
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€�/g, '"')
    .replace(/\r\n/g, '\n')
    .trim();
};

const isSectionHeading = (line) => /^\d+\.\s+\S/.test(line);
const isClauseHeading = (line) =>
  /^\d+\.\d+(?:\s+\S.*)?$/.test(line) &&
  !/^\d+\.\d+\.\d+/.test(line) &&
  line.length < 90 &&
  !/[.;:]$/.test(line);
const isDocumentHeading = (line) =>
  line.toLowerCase() === 'terms and conditions of sale' || line === 'Acceptance';
const isLikelyListItem = (line) =>
  line.length <= 140 &&
  !isSectionHeading(line) &&
  !isClauseHeading(line) &&
  !line.includes(' means ') &&
  !line.startsWith('"') &&
  !/^\d+\.\d+\.\d+/.test(line);

const buildTermsBlocks = (text) => {
  const blocks = [];
  const lines = text.split('\n').map((line) => line.trim());
  let expectList = false;
  let inList = false;

  lines.forEach((line) => {
    if (!line) {
      inList = false;
      return;
    }

    if (isDocumentHeading(line)) {
      if (line === 'Acceptance') {
        blocks.push({ type: 'section', text: line });
      }
      expectList = false;
      inList = false;
      return;
    }

    if (isSectionHeading(line)) {
      blocks.push({ type: 'section', text: line });
      expectList = false;
      inList = false;
      return;
    }

    if (isClauseHeading(line)) {
      blocks.push({ type: 'clause', text: line });
      expectList = false;
      inList = false;
      return;
    }

    if ((expectList || inList) && isLikelyListItem(line)) {
      blocks.push({ type: 'listItem', text: line });
      expectList = false;
      inList = true;
      return;
    }

    blocks.push({ type: 'paragraph', text: line });
    expectList = /:\s*$/.test(line);
    inList = false;
  });

  return blocks;
};

function TermsAndConditions() {
  const [termsText, setTermsText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/terms-and-conditions.txt')
      .then((response) => {
        if (!response.ok) throw new Error('Terms document could not be loaded.');
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setTermsText(normalizeTermsText(text));
      })
      .catch(() => {
        if (!cancelled) setTermsText('');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const blocks = useMemo(() => buildTermsBlocks(termsText), [termsText]);

  return (
    <div className="bg-white py-10 sm:py-14">
      <Seo
        title="Terms and Conditions of Sale"
        description="Terms and Conditions of Sale for ELM SHELF."
        canonicalPath="/terms-and-conditions"
      />
      <div className="shell max-w-5xl">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">ELM SHELF</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Terms and Conditions of Sale
          </h1>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-8 text-sm font-semibold text-slate-600">
            Loading terms and conditions...
          </div>
        ) : blocks.length > 0 ? (
          <article className="rounded-lg border border-slate-200 bg-white px-5 py-6 text-left shadow-sm sm:px-8 sm:py-8">
            <div className="text-sm leading-7 text-slate-700 sm:text-base">
              {blocks.map((block, index) => {
                if (block.type === 'section') {
                  return (
                    <h2
                      key={`${block.text}-${index}`}
                      className="mt-9 border-t border-slate-200 pt-6 text-xl font-bold leading-snug text-slate-950 first:mt-0 first:border-t-0 first:pt-0"
                    >
                      {block.text}
                    </h2>
                  );
                }

                if (block.type === 'clause') {
                  return (
                    <h3 key={`${block.text}-${index}`} className="mt-5 text-base font-bold leading-snug text-slate-900">
                      {block.text}
                    </h3>
                  );
                }

                if (block.type === 'listItem') {
                  return (
                    <p key={`${block.text}-${index}`} className="my-1 flex gap-2 pl-5 text-slate-700">
                      <span className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                      <span>{block.text}</span>
                    </p>
                  );
                }

                return (
                  <p key={`${block.text}-${index}`} className="mt-3 max-w-none text-slate-700">
                    {block.text}
                  </p>
                );
              })}
            </div>
          </article>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-8 text-sm font-semibold text-red-700">
            Terms and conditions are currently unavailable.
          </div>
        )}
      </div>
    </div>
  );
}

export default TermsAndConditions;
