import { useEffect, useRef } from "react";
import { LuX } from "react-icons/lu";

/**
 * A dialog that is a bottom sheet on a phone and a centred card on a bigger screen.
 * `locked` stops Esc and a click outside from closing it (used when a choice must be made).
 */
export default function Modal({ title, subtitle, onClose, locked = false, size = "md", children, footer }) {
  const ref = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !locked && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous && previous.focus) previous.focus();
    };
  }, [locked, onClose]);

  const width = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-ink-950/70 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !locked && onClose) onClose();
      }}
    >
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[92vh] w-full animate-pop-in flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop outline-none sm:rounded-3xl ${width}`}>
        <header className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <span className="absolute inset-x-0 top-0 h-1 bg-spark-grad" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink-950">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          {!locked && onClose && (
            <button type="button" onClick={onClose} aria-label="Close" className="-m-1.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <LuX className="h-5 w-5" />
            </button>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="border-t border-slate-100 bg-ink-50/60 px-6 py-3.5">{footer}</footer>}
      </div>
    </div>
  );
}
