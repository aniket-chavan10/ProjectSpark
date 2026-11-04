import { useEffect, useRef, useState } from "react";
import { LuCheck, LuChevronDown, LuCopy, LuExternalLink, LuMonitorPlay, LuRadio, LuSlidersHorizontal } from "react-icons/lu";
import { overlayApi } from "../../api/sparkApi";
import { cx } from "../ui/kit";

function CopyRow({ icon: Icon, title, hint, url, action }) {
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
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-spark-400">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-zinc-400">{hint}</p>
        </div>
      </div>
      {url ? (
        <div className="mt-2.5 flex items-center gap-2">
          <input readOnly value={url} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-[11px] text-zinc-300" aria-label={`${title} link`} />
          <button type="button" onClick={copy} className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors", copied ? "bg-green-600 text-white" : "bg-zinc-100 text-zinc-900 hover:bg-white")}>
            {copied ? <LuCheck className="h-3.5 w-3.5" /> : <LuCopy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center rounded-md border border-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-800" aria-label={`Open ${title}`} title="Open in a new tab">
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
 * graphics (the graphics desk). The operator's link carries a key for this match only, so they need no login.
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
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open} className="inline-flex h-8 items-center gap-2 rounded-md bg-zinc-800 px-3 text-[13px] font-semibold text-zinc-100 ring-1 ring-inset ring-zinc-700 transition-colors hover:bg-zinc-700">
        <LuRadio className="h-4 w-4 text-red-400" aria-hidden="true" />
        Broadcast
        <LuChevronDown className={cx("h-4 w-4 text-zinc-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div role="dialog" aria-label="Broadcast links" className="absolute right-0 top-full z-50 mt-2 w-[26rem] max-w-[calc(100vw-1.5rem)] divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-2xl">
          <CopyRow icon={LuMonitorPlay} title="Overlay for OBS" hint="Add it as a Browser source, 1920 × 1080, with a transparent background. It shows the live score bar." url={overlayUrl} />
          <CopyRow
            icon={LuSlidersHorizontal}
            title="Graphics desk"
            hint={link ? `Send this to the person running the graphics. Works for ${link.hours} hours, for this match only, with no login.` : "A separate screen for whoever runs the on-air graphics (squads, scorecard, result, what the score bar shows). They open it on their own computer."}
            url={link ? link.url : null}
            action={
              <>
                <button type="button" onClick={make} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-spark-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-spark-500 disabled:opacity-60">
                  {busy ? "Creating…" : "Create operator link"}
                </button>
                {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              </>
            }
          />
          {link && (
            <div className="flex items-center justify-between bg-zinc-950/50 px-4 py-2.5">
              <p className="text-xs text-zinc-400">Anyone with this link can control the overlay of this match.</p>
              <button type="button" onClick={make} disabled={busy} className="text-xs font-semibold text-spark-400 hover:underline">
                New link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
