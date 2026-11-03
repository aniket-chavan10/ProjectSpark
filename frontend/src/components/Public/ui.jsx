// Small pieces shared by the public pages and the team dashboard: layout, data loading, cards, tables.
import { useEffect, useState } from "react";
import { LuMapPin } from "react-icons/lu";
import { Link } from "react-router-dom";
import Navbar from "../Navbar";
import { SparkMark } from "../layout/AppShell";
import { fileUrl, shortDate } from "../../api/sparkApi";
import SponsorStrip from "./Sponsors";
import { teamCode, teamColor } from "../Scoring/scoreUtils";

/** Load something when the screen opens (or `deps` change): { data, error, loading }. */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    fn()
      .then((data) => alive && setState({ data, error: "", loading: false }))
      .catch((e) => alive && setState({ data: null, error: e.message, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export const Loading = ({ label = "Loading…" }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500" role="status">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" aria-hidden="true" />
    {label}
  </div>
);

export const ErrorBox = ({ children }) => (
  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
    {children}
  </div>
);

export const Empty = ({ children }) => <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">{children}</div>;

const FOOTER = [
  { title: "The season", links: [["Tournaments", "/tournaments"], ["Results", "/results"], ["Rankings", "/rankings"], ["Awards", "/awards"]] },
  { title: "Teams", links: [["All teams", "/teams"], ["Register a team", "/sign-up"], ["Team admin login", "/sign-in"], ["Association login", "/ma-signin"]] },
];

function SiteFooter() {
  return (
    <footer className="bg-ink-950 text-ink-300">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 text-white" aria-label="Spark home">
            <SparkMark size={34} />
            <span className="font-display text-2xl font-extrabold uppercase tracking-wider">Spark</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">Results, scorecards and rankings of the tournaments played under the association, scored ball by ball.</p>
        </div>
        {FOOTER.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-spark-300">{col.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map(([name, to]) => (
                <li key={name}>
                  <Link to={to} className="font-semibold transition hover:text-white">
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-[1600px] px-4 py-4 text-xs text-ink-400 sm:px-6 lg:px-10">© {new Date().getFullYear()} Spark · Cricket association</p>
      </div>
    </footer>
  );
}

/** Page frame of the public site. `hero` is a full-width banner under the menu (the home page uses it). */
export function PublicLayout({ title, subtitle, actions, children, tight, hero }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />
      {hero}
      {title && (
        <header className="relative overflow-hidden bg-stadium text-white">
          <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-50 [background-size:44px_44px] [mask-image:linear-gradient(100deg,black,transparent_75%)]" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-spark-500/25 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-4 px-4 py-10 sm:px-6 lg:px-10">
            <div>
              <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-wide sm:text-5xl">{title}</h1>
              {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-ink-200">{subtitle}</p>}
            </div>
            {actions}
          </div>
          <div className="h-1 bg-spark-grad" aria-hidden="true" />
        </header>
      )}
      <main className={`mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 ${tight ? "py-4" : "py-8"}`}>{children}</main>
      <div className="mx-auto max-w-[1600px] px-4 pb-8 sm:px-6 lg:px-10">
        <SponsorStrip placement="footer" heading={false} className="!shadow-none" />
      </div>
      <SiteFooter />
    </div>
  );
}

export const Section = ({ title, link, children, className = "" }) => (
  <section className={`mb-10 ${className}`}>
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide text-ink-950">{title}</h2>
      {link && (
        <Link to={link.to} className="text-sm font-bold text-spark-700 hover:underline">
          {link.label} →
        </Link>
      )}
    </div>
    {children}
  </section>
);

const initialsOf = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

/** A team's logo, or its initials in a colour when it has none. */
export function TeamLogo({ team, size = 40 }) {
  const url = fileUrl(team && team.logo);
  const style = { width: size, height: size, minWidth: size, fontSize: Math.max(11, size / 2.8) };
  if (url) return <img src={url} alt="" style={style} className="rounded-full bg-white object-cover ring-1 ring-ink-200" />;
  const id = Number((team && (team.id ?? team.teamId)) || 0);
  return (
    <span style={{ ...style, background: teamColor(id) }} className="inline-flex items-center justify-center rounded-full font-extrabold text-white" aria-hidden="true">
      {teamCode(team && team.name)}
    </span>
  );
}

export function PlayerPhoto({ player, size = 40 }) {
  const url = fileUrl(player && player.photo);
  const style = { width: size, height: size, minWidth: size, fontSize: Math.max(11, size / 2.8) };
  return url ? (
    <img src={url} alt="" style={style} className="rounded-full bg-slate-200 object-cover" />
  ) : (
    <span style={style} className="inline-flex items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600" aria-hidden="true">
      {initialsOf(player && player.name) || "?"}
    </span>
  );
}

const MEDAL = { 1: ["bg-amber-400 text-amber-950", "Champion"], 2: ["bg-slate-300 text-slate-800", "Runner-up"], 3: ["bg-slate-300 text-slate-950", "Third"], 4: ["bg-slate-100 text-slate-600", "Fourth"] };
export const Medal = ({ position }) => {
  const m = MEDAL[position];
  return m ? (
    <span title={m[1]} className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${m[0]}`}>
      {position}
    </span>
  ) : null;
};

const clock12 = (t) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ""));
  if (!m) return t || "";
  const h = +m[1];
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "am" : "pm"}`;
};
const CARD = "group relative block w-full overflow-hidden rounded-2xl border border-ink-100 bg-white text-left shadow-card transition focus:outline-none focus-visible:ring-2 focus-visible:ring-spark-500";

/** A finished match as a card; click opens the scorecard. */
export function ResultCard({ m, onOpen }) {
  const scoreOf = (teamId) => m.innings.find((i) => i.teamId === teamId);
  // on the public site a card is a link; inside a dashboard the screen opens the scorecard itself
  const Shell = ({ children }) =>
    onOpen ? (
      <button type="button" onClick={onOpen} className={`${CARD} hover:-translate-y-0.5 hover:shadow-raised`}>
        {children}
      </button>
    ) : (
      <Link to={`/matches/${m.matchId}`} className={`${CARD} hover:-translate-y-0.5 hover:shadow-raised`}>
        {children}
      </Link>
    );
  return (
    <Shell>
      <div className="flex items-center justify-between gap-3 bg-ink-950 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-200">
        <span className="truncate">
          {m.tournament || "Match"} · {m.stageLabel}
        </span>
        <span className="shrink-0 text-spark-300">{shortDate(m.date)}</span>
      </div>
      <div className="space-y-1 px-4 py-3">
        {m.teams.map((t) => {
          const s = scoreOf(t.id);
          const won = m.winnerTeamId === t.id;
          return (
            <div key={t.id} className="flex items-center justify-between gap-3 py-1">
              <span className="flex min-w-0 items-center gap-2.5">
                <TeamLogo team={t} size={32} />
                <span className={`truncate text-[15px] ${won ? "font-extrabold text-ink-950" : "font-semibold text-ink-600"}`}>{t.name}</span>
                {won && <span className="h-1.5 w-1.5 rounded-full bg-spark-500" aria-hidden="true" />}
              </span>
              <span className={`shrink-0 tabular-nums ${won ? "font-display text-2xl font-extrabold text-ink-950" : "font-display text-xl font-bold text-ink-400"}`}>
                {s ? `${s.runs}/${s.wickets}` : "—"} {s && <span className="font-sans text-xs font-semibold text-ink-400">({s.overs})</span>}
              </span>
            </div>
          );
        })}
      </div>
      <p className="bg-gradient-to-r from-spark-50 to-transparent px-4 py-2 text-xs font-bold text-spark-800">{m.result || "Result"}</p>
    </Shell>
  );
}

export function FixtureCard({ f }) {
  return (
    <div className={CARD}>
      <div className="flex items-center justify-between gap-3 bg-ink-950 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-200">
        <span className="truncate">
          {f.tournament} · {f.stageLabel}
        </span>
        <span className="shrink-0 text-spark-300">
          {shortDate(f.date)} · {clock12(f.time)}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-4">
        {f.teams.map((t, i) => [
          i === 1 && (
            <span key="vs" className="rounded-lg bg-ink-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-ink-500">
              vs
            </span>
          ),
          <div key={t.id} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
            <TeamLogo team={t} size={44} />
            <span className="w-full truncate text-sm font-bold text-ink-900">{t.name}</span>
          </div>,
        ])}
      </div>
      {f.venue && (
        <p className="flex items-center gap-1.5 border-t border-ink-100 bg-ink-50/60 px-4 py-2 text-xs text-ink-500">
          <LuMapPin className="h-3.5 w-3.5" aria-hidden="true" /> {f.venue}
        </p>
      )}
    </div>
  );
}

export const Th = ({ children, right, className = "" }) => <th className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ${right ? "text-right" : "text-left"} ${className}`}>{children}</th>;
export const Td = ({ children, right, bold, className = "" }) => <td className={`px-3 py-2 text-sm ${right ? "text-right tabular-nums" : ""} ${bold ? "font-bold text-slate-900" : "text-slate-700"} ${className}`}>{children}</td>;

export const TableWrap = ({ children }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
    <table className="min-w-full divide-y divide-slate-100">{children}</table>
  </div>
);

export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="mb-5 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${value === t.id ? "bg-emerald-600 text-white shadow" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"}`}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}

export const StatBox = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
    <p className="text-2xl font-extrabold tabular-nums text-slate-900">{value}</p>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
  </div>
);

export const SearchBox = ({ value, onChange, placeholder }) => (
  <input
    type="search"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    aria-label={placeholder}
    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 sm:max-w-md"
  />
);

/** Wait a moment after typing before asking the server. */
export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
