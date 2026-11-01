import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

import { button, panel } from '../../utils/adminPresentation';

export function PageHeading({ eyebrow, title, description, children }) {
  return <header className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-[10px] font-bold tracking-[2px] text-[#dc4939]">{eyebrow}</p><h1 className="m-0 text-3xl font-semibold tracking-tight">{title}</h1><p className="mb-0 mt-3 max-w-2xl text-sm leading-6 text-[#888]">{description}</p></div><div className="flex flex-wrap gap-2">{children}</div></header>;
}
export function Stats({ items }) {
  return <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">{items.map(item => <div key={item.label} className={panel}><p className="m-0 text-xs text-[#888]">{item.label}</p><strong className="mt-2 block text-2xl font-semibold">{item.value}</strong>{item.note && <p className="mb-0 mt-2 text-[11px] text-[#999]">{item.note}</p>}</div>)}</div>;
}
export function Empty({ children }) { return <p className="rounded-xl border border-dashed border-[#ddd] px-5 py-12 text-center text-sm text-[#888]">{children}</p>; }
export function ErrorNotice({ message, onRetry }) { return message ? <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}{onRetry && <button onClick={onRetry} className="ml-3 cursor-pointer underline">Retry</button>}</div> : null; }
export function Modal({ open, title, onClose, busy = false, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-[#e5e5e2] bg-white p-0 text-[#252525] shadow-2xl backdrop:bg-black/50"><div className="flex items-center justify-between gap-4 border-b border-[#eee] px-6 py-4"><h2 id={titleId} className="m-0 font-sans! text-lg font-semibold">{title}</h2><button type="button" className={button} disabled={busy} onClick={onClose} aria-label="Close dialog"><X size={16} /></button></div><div className="p-6">{children}</div></dialog>;
}
export function Pager({ page, pages, onChange, busy = false }) {
  return <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#888]"><span>Page {page} of {Math.max(1, pages)}</span><div className="flex gap-2"><button className={button} disabled={busy || page <= 1} onClick={() => onChange(page - 1)}>Previous</button><button className={button} disabled={busy || page >= pages} onClick={() => onChange(page + 1)}>Next</button></div></div>;
}
