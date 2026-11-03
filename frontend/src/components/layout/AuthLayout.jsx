import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuArrowLeft, LuChartNoAxesColumn, LuRadio, LuShieldCheck, LuTrophy, LuUsers } from "react-icons/lu";
import { SparkMark } from "./AppShell";
import { publicApi } from "../../api/sparkApi";
import { cx } from "../ui/kit";

const Point = ({ icon: Icon, title, children, delay }) => (
  <li className="flex animate-fade-up gap-4" style={{ animationDelay: delay }}>
    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-spark-300 ring-1 ring-inset ring-white/10 backdrop-blur">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <div>
      <p className="font-bold text-white">{title}</p>
      <p className="text-sm text-ink-300">{children}</p>
    </div>
  </li>
);

/** A floodlit pitch drawn in lines: the oval, the 30-yard circle and the strip. */
const Pitch = () => (
  <svg viewBox="0 0 600 600" className="pointer-events-none absolute -right-40 top-1/2 h-[780px] w-[780px] -translate-y-1/2 opacity-[0.14]" fill="none" aria-hidden="true">
    <ellipse cx="300" cy="300" rx="290" ry="270" stroke="white" strokeWidth="2" />
    <ellipse cx="300" cy="300" rx="170" ry="160" stroke="white" strokeWidth="2" strokeDasharray="6 10" />
    <rect x="285" y="230" width="30" height="140" stroke="white" strokeWidth="2" />
    <path d="M280 248h40M280 352h40" stroke="white" strokeWidth="2" />
  </svg>
);

/** The two ways in: a team admin, or the association. Both are plain links, so each has its own address. */
export function AuthTabs({ active }) {
  const items = [
    { id: "team", to: "/sign-in", label: "Team admin", icon: LuUsers },
    { id: "association", to: "/ma-signin", label: "Association", icon: LuShieldCheck },
  ];
  return (
    <nav aria-label="Who is signing in" className="mb-7 grid grid-cols-2 gap-1 rounded-2xl bg-ink-50 p-1 ring-1 ring-inset ring-ink-100">
      {items.map((i) => {
        const on = active === i.id;
        return (
          <Link
            key={i.id}
            to={i.to}
            aria-current={on ? "page" : undefined}
            className={cx(
              "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition",
              on ? "bg-white text-ink-950 shadow-card ring-1 ring-ink-100" : "text-ink-500 hover:text-ink-900"
            )}
          >
            <i.icon className={cx("h-4 w-4", on ? "text-spark-600" : "")} aria-hidden="true" />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

// the association's numbers under the headline; quietly left out if the server cannot be reached
function Numbers() {
  const [c, setC] = useState(null);
  useEffect(() => {
    let alive = true;
    publicApi
      .overview()
      .then((d) => alive && setC(d.counts))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!c) return null;
  const items = [
    ["Teams", c.teams],
    ["Players", c.players],
    ["Tournaments", c.tournaments],
    ["Matches", c.matches],
  ];
  return (
    <dl className="mt-12 grid max-w-xl grid-cols-4 divide-x divide-white/10 rounded-2xl bg-ink-950/60 py-4 ring-1 ring-inset ring-white/10 backdrop-blur-md">
      {items.map(([k, v]) => (
        <div key={k} className="px-4">
          <dd className="font-display text-3xl font-extrabold leading-none text-white">{v}</dd>
          <dt className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-300">{k}</dt>
        </div>
      ))}
    </dl>
  );
}

/** The frame of the sign-in pages: a floodlit stadium, the product on the left, the form in a card on the right. */
export default function AuthLayout({ title, subtitle, children, footer, eyebrow = "Sign in" }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-stadium text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" aria-hidden="true" />
      <Pitch />
      {/* running light lines */}
      <div className="pointer-events-none absolute -left-20 bottom-24 h-24 w-[70%] -skew-x-12 overflow-hidden opacity-70" aria-hidden="true">
        <div className="run-stripes h-full w-full bg-gradient-to-r from-spark-600/50 via-spark-500/20 to-transparent" />
      </div>
      <div className="pointer-events-none absolute -right-10 top-20 h-10 w-[45%] -skew-x-12 overflow-hidden opacity-60" aria-hidden="true">
        <div className="run-stripes h-full w-full bg-gradient-to-l from-volt-500/50 via-volt-500/10 to-transparent" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1500px] items-center gap-10 px-5 py-8 sm:px-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 xl:px-16">
        <section className="hidden lg:block">
          <div className="flex items-center gap-3">
            <SparkMark size={48} />
            <span className="font-display text-4xl font-extrabold uppercase italic tracking-wide">Spark</span>
          </div>
          <h2 className="mt-12 max-w-xl font-display text-6xl font-extrabold uppercase leading-[0.95] tracking-wide xl:text-7xl">
            Run your cricket <span className="text-gradient-spark">like a broadcaster.</span>
          </h2>
          <ul className="mt-10 max-w-md space-y-6">
            <Point icon={LuTrophy} title="Tournaments, end to end" delay="80ms">
              Groups, schedule, brackets and results in one place.
            </Point>
            <Point icon={LuChartNoAxesColumn} title="Ball-by-ball scoring" delay="160ms">
              A scoring console built for speed, with every rule checked for you.
            </Point>
            <Point icon={LuRadio} title="Live broadcast graphics" delay="240ms">
              TV-style score bar and on-air graphics for OBS, from their own console.
            </Point>
          </ul>
          <Numbers />
        </section>

        <main className="mx-auto w-full max-w-[30rem]">
          <Link to="/" className="mb-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-ink-300 hover:text-white">
            <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the site
          </Link>
          <div className="relative animate-pop-in overflow-hidden rounded-3xl bg-white p-7 text-ink-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,.7)] sm:p-9">
            <span className="absolute inset-x-0 top-0 h-1.5 bg-spark-grad" aria-hidden="true" />
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <SparkMark size={36} />
              <span className="font-display text-2xl font-extrabold uppercase italic tracking-wide text-ink-950">Spark</span>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-spark-600">{eyebrow}</p>
            <h1 className="mt-1 font-display text-4xl font-extrabold uppercase tracking-wide text-ink-950">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-ink-500">{subtitle}</p>}
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 border-t border-ink-100 pt-5 text-sm text-ink-500">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
