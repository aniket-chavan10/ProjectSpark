import { Link } from "react-router-dom";
import { LuArrowLeft, LuChartNoAxesColumn, LuRadio, LuTrophy } from "react-icons/lu";
import { SparkMark } from "./AppShell";

const Point = ({ icon: Icon, title, children }) => (
  <li className="flex gap-4">
    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300 ring-1 ring-inset ring-white/10">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <div>
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-ink-300">{children}</p>
    </div>
  </li>
);

/** The frame of the sign-in pages: the product on the left, the form on the right. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative flex items-center gap-3">
          <SparkMark size={40} />
          <span className="text-xl font-bold tracking-tight">Spark</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Run your cricket tournament like a broadcaster.</h2>
          <ul className="mt-10 space-y-6">
            <Point icon={LuTrophy} title="Tournaments, end to end">Groups, schedule, brackets and results in one place.</Point>
            <Point icon={LuChartNoAxesColumn} title="Ball-by-ball scoring">A scoring console built for speed, with every rule checked for you.</Point>
            <Point icon={LuRadio} title="Live broadcast graphics">Score bar and on-air graphics for OBS, run from their own console.</Point>
          </ul>
        </div>
        <p className="relative text-xs text-ink-400">Village cricket, scored properly.</p>
      </aside>

      <main className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the site
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <SparkMark size={36} />
            <span className="text-lg font-bold tracking-tight text-slate-900">Spark</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-slate-500">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
