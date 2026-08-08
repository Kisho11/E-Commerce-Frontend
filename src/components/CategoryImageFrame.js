import React from 'react';

function CategoryImageFrame({
  src = '',
  alt = '',
  loading = false,
  className = '',
  imageClassName = 'h-full w-full object-cover',
  placeholderText = 'No image',
}) {
  return (
    <div className={`overflow-hidden bg-slate-100 ${className}`}>
      {loading ? (
        <div className="h-full w-full animate-pulse bg-slate-200" aria-label="Loading category image" />
      ) : src ? (
        <img src={src} alt={alt} className={imageClassName} />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs font-semibold text-slate-500">
          {placeholderText}
        </div>
      )}
    </div>
  );
}

export default CategoryImageFrame;
