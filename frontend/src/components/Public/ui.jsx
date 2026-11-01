// Small pieces shared by the public pages and the team dashboard: layout, data loading, cards, tables.
import { useEffect, useState } from "react";
import { LuMapPin } from "react-icons/lu";
import { Link } from "react-router-dom";
import Navbar from "../Navbar";
import { fileUrl, shortDate } from "../../api/sparkApi";
import SponsorStrip from "./Sponsors";

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

/** Page frame of the public site. */
export function PublicLayout({ title, subtitle, actions, children, tight }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      {title && (
        <header className="bg-ink-900 text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-8 sm:px-6 lg:px-8">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-300">{subtitle}</p>}
            </div>
            {actions}
          </div>
        </header>
      )}
      <main className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${tight ? "py-4" : "py-8"}`}>{children}</main>
      <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <SponsorStrip placement="footer" heading={false} className="!shadow-none" />
      </div>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">Cricket association · results, rankings and scorecards</footer>
    </div>
  );
}

export const Section = ({ title, link, children, className = "" }) => (
  <section className={`mb-10 ${className}`}>
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {link && (
        <Link to={link.to} className="text-sm font-semibold text-emerald-700 hover:underline">
          {link.label} →
        </Link>
      )}
    </div>
    {children}
  </section>
);

const COLORS = ["bg-emerald-600", "bg-brand-600", "bg-brand-600", "bg-slate-600", "bg-amber-600", "bg-brand-600", "bg-slate-600", "bg-slate-600"];
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
  if (url) return <img src={url} alt="" style={style} className="rounded-full bg-white object-cover ring-1 ring-slate-200" />;
  const id = Number((team && (team.id ?? team.teamId)) || 0);
  return (
    <span style={style} className={`inline-flex items-center justify-center rounded-full font-bold text-white ${COLORS[Math.abs(id) % COLORS.length]}`} aria-hidden="true">
      {initialsOf(team && team.name) || "?"}
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

/** A finished match as a card; click opens the scorecard. */
export function ResultCard({ m, onOpen }) {
  const scoreOf = (teamId) => m.innings.find((i) => i.teamId === teamId);
  const cls = "block w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";
  // on the public site a card is a link; inside a dashboard the screen opens the scorecard itself
  const Shell = ({ children }) =>
    onOpen ? (
      <button type="button" onClick={onOpen} className={cls}>
        {children}
      </button>
    ) : (
      <Link to={`/matches/${m.matchId}`} className={cls}>
        {children}
      </Link>
    );
  return (
    <Shell>
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="truncate font-semibold text-slate-600">
          {m.tournament || "Match"} · {m.stageLabel}
        </span>
        <span className="shrink-0">{shortDate(m.date)}</span>
      </div>
      {m.teams.map((t) => {
        const s = scoreOf(t.id);
        const won = m.winnerTeamId === t.id;
        return (
          <div key={t.id} className="flex items-center justify-between gap-3 py-1">
            <span className="flex min-w-0 items-center gap-2">
              <TeamLogo team={t} size={28} />
              <span className={`truncate text-sm ${won ? "font-bold text-slate-900" : "text-slate-700"}`}>{t.name}</span>
            </span>
            <span className={`shrink-0 tabular-nums text-sm ${won ? "font-bold text-slate-900" : "text-slate-600"}`}>
              {s ? `${s.runs}/${s.wickets}` : "—"} {s && <span className="text-xs text-slate-400">({s.overs})</span>}
            </span>
          </div>
        );
      })}
      <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">{m.result || "Result"}</p>
    </Shell>
  );
}

export function FixtureCard({ f }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="truncate font-semibold text-slate-600">
          {f.tournament} · {f.stageLabel}
        </span>
        <span className="shrink-0 font-semibold text-emerald-700">
          {shortDate(f.date)} {f.time}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        {f.teams.map((t, i) => (
          <div key={t.id} className={`flex min-w-0 flex-1 items-center gap-2 ${i ? "justify-end text-right" : ""}`}>
            {i === 0 && <TeamLogo team={t} size={30} />}
            <span className="truncate text-sm font-semibold text-slate-800">{t.name}</span>
            {i === 1 && <TeamLogo team={t} size={30} />}
          </div>
        ))}
      </div>
      {f.venue && <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><LuMapPin className="h-3.5 w-3.5" aria-hidden="true" /> {f.venue}</p>}
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
