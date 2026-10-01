import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Product photos received from the China API.
 * - <ProductThumb images={[...]} />   small thumbnail for tables (click = full view)
 * - <ProductGallery images={[...]} /> photo grid for detail pages
 * Both open the same lightbox. Images that fail to load are hidden gracefully.
 */

function Lightbox({ images, start = 0, onClose }) {
  const [index, setIndex] = useState(start);
  const count = images.length;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % count);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center"
        aria-label="Close"
      >
        <X size={18} />
      </button>

      {count > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + count) % count); }}
          className="absolute left-4 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center"
          aria-label="Previous"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      <img
        src={images[index]}
        alt={`Product ${index + 1}`}
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-[92vw] rounded-lg bg-white object-contain"
      />

      {count > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % count); }}
          className="absolute right-4 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center"
          aria-label="Next"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {count > 1 && (
        <div className="absolute bottom-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
          {index + 1} / {count}
        </div>
      )}
    </div>
  );
}

function SafeImg({ src, className, alt }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`${className} bg-slate-100 text-slate-400 flex items-center justify-center`}>
        <ImageIcon size={16} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function ProductThumb({ images }) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const [open, setOpen] = useState(false);

  if (list.length === 0) {
    return (
      <div className="h-10 w-10 shrink-0 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-300 flex items-center justify-center">
        <ImageIcon size={16} />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200"
        title={`${list.length} photo(s)`}
      >
        <SafeImg src={list[0]} alt="Product" className="h-full w-full object-cover" />
        {list.length > 1 && (
          <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[9px] font-bold text-white">
            +{list.length - 1}
          </span>
        )}
      </button>
      {open && <Lightbox images={list} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ProductGallery({ images }) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const [openAt, setOpenAt] = useState(null);

  if (list.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-400">
        No product photo received from the China API for this package.
      </div>
    );
  }

  return (
    <>
      <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
        {list.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpenAt(i)}
            className="aspect-square overflow-hidden rounded-xl border border-slate-200"
          >
            <SafeImg src={src} alt={`Product ${i + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {openAt !== null && <Lightbox images={list} start={openAt} onClose={() => setOpenAt(null)} />}
    </>
  );
}
