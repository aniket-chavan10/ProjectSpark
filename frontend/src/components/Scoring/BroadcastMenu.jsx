import { useEffect, useRef, useState } from "react";
import { LuCheck, LuChevronDown, LuCopy, LuExternalLink, LuMonitorPlay, LuRadio, LuSlidersHorizontal } from "react-icons/lu";
import { overlayApi } from "../../api/sparkApi";
import { cx } from "../ui/kit";

function CopyRow({ icon: Icon, title, hint, url, onOpen, action }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
      </div>
      {url ? (
        <div className="mt-2.5 flex items-center gap-2">
          <input readOnly value={url} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-600" aria-label={`${title} link`} />
          <button type="button" onClick={copy} className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors", copied ? "bg-emerald-600 text-white" : "bg-ink-900 text-white hover:bg-ink-800")}>
            {copied ? <LuCheck className="h-3.5 w-3.5" /> : <LuCopy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50" aria-label={`Open ${title}`} title="Open in a new tab" onClick={onOpen}>
            <LuExternalLink className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <div className="mt-2.5">{action}</div>
      )}
    </div>
  );
}

/**
 * The scorer's "Broadcast" menu: the overlay address for OBS, and a link to hand to the person who runs the
 * graphics (the operator console). The operator's link carries a key for this match only, so they need no login.
 */
export default function BroadcastMenu({ matchId }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(null); // { url, hours }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const overlayUrl = `${window.location.origin}/overlay/${matchId}`;

  const make = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await overlayApi.createOperatorLink(matchId);
      setLink({ url: `${window.location.origin}${res.path}`, hours: res.expiresInHours });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15"
      >
        <LuRadio className="h-4 w-4 text-ink-200" aria-hidden="true" />
        Broadcast
        <LuChevronDown className={cx("h-4 w-4 text-ink-300 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div role="dialog" aria-label="Broadcast links" className="absolute right-0 top-full z-50 mt-2 w-[26rem] max-w-[calc(100vw-1.5rem)] divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-pop">
          <CopyRow icon={LuMonitorPlay} title="Overlay for OBS" hint="Add it as a Browser source, 1920 × 1080, with a transparent background. It shows the live score bar." url={overlayUrl} />
          <CopyRow
            icon={LuSlidersHorizontal}
            title="Operator console"
            hint={link ? `Send this to the person running the graphics. Works for ${link.hours} hours, for this match only, with no login.` : "A separate screen for whoever runs the on-air graphics (squads, scorecard, result ...). They open it on their own computer."}
            url={link ? link.url : null}
            action={
              <>
                <button type="button" onClick={make} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-60">
                  {busy ? "Creating…" : "Create operator link"}
                </button>
                {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              </>
            }
          />
          {link && (
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
              <p className="text-xs text-slate-500">Anyone with this link can control the overlay of this match.</p>
              <button type="button" onClick={make} disabled={busy} className="text-xs font-semibold text-emerald-700 hover:underline">
                New link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
