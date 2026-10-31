import { publicApi, fileUrl } from "../../api/sparkApi";
import { useLoad } from "./ui";

// Sponsors of the association. A title sponsor is shown large, gold and silver medium, partners as a small strip.
// Nothing is shown at all when there are no sponsors for the place.

const SIZE = { title: "h-20 sm:h-24", gold: "h-14 sm:h-16", silver: "h-11", partner: "h-9" };
const TITLE = { title: "Title sponsor", gold: "Gold sponsors", silver: "Silver sponsors", partner: "Our partners" };

function Logo({ s }) {
  const url = fileUrl(s.logo);
  const inner = url ? (
    <img src={url} alt={s.name} className={`${SIZE[s.tier]} w-auto max-w-[11rem] object-contain`} />
  ) : (
    <span className={`inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 font-bold text-slate-700 ${SIZE[s.tier]}`}>{s.name}</span>
  );
  return s.link ? (
    <a href={s.link} target="_blank" rel="noopener noreferrer sponsored" title={s.tagline || s.name} className="inline-flex items-center opacity-90 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
      {inner}
    </a>
  ) : (
    <span title={s.tagline || s.name} className="inline-flex items-center">
      {inner}
    </span>
  );
}

export default function SponsorStrip({ placement, heading = true, className = "" }) {
  const { data } = useLoad(() => publicApi.sponsors(placement), [placement]);
  if (!data || data.length === 0) return null;
  const tiers = ["title", "gold", "silver", "partner"].map((t) => [t, data.filter((s) => s.tier === t)]).filter(([, list]) => list.length);
  return (
    <section aria-label="Sponsors" className={`rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm ${className}`}>
      {heading && <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Proudly supported by</p>}
      <div className="space-y-5">
        {tiers.map(([tier, list]) => (
          <div key={tier} className="text-center">
            {tiers.length > 1 && <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{TITLE[tier]}</p>}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              {list.map((s) => (
                <Logo key={s.id} s={s} />
              ))}
            </div>
            {tier === "title" && list[0].tagline && <p className="mt-2 text-sm text-slate-500">{list[0].tagline}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
