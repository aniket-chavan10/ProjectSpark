// The frame of every signed-in area: a dark navy sidebar with line icons, a slim top bar, the page, and on a
// phone a drawer plus an optional bottom tab bar. Team admin and association both use it, so they feel alike.
import { useEffect, useState } from "react";
import { LuChevronDown, LuLogOut, LuMenu, LuX, LuZap } from "react-icons/lu";
import { cx } from "../ui/kit";

export const SparkMark = ({ size = 32 }) => (
  <span style={{ width: size, height: size }} className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-spark-grad text-white shadow-glow">
    <span className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgba(255,255,255,.16)_0_2px,transparent_2px_9px)]" aria-hidden="true" />
    <LuZap style={{ width: size * 0.56, height: size * 0.56 }} className="relative -skew-x-6 fill-white" aria-hidden="true" />
  </span>
);

function NavItem({ item, active, onSelect, depth = 0 }) {
  const [open, setOpen] = useState(() => !!item.children?.some((c) => c.id === active));
  const Icon = item.icon;
  const hasKids = !!item.children?.length;
  const childActive = hasKids && item.children.some((c) => c.id === active);
  const isActive = active === item.id;

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const click = () => (hasKids ? setOpen((o) => !o) : onSelect(item.id));

  return (
    <li>
      <button
        type="button"
        onClick={click}
        aria-current={isActive ? "page" : undefined}
        aria-expanded={hasKids ? open : undefined}
        className={cx(
          "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold transition-all",
          depth ? "pl-4" : "",
          isActive ? "bg-gradient-to-r from-spark-500/25 via-spark-500/10 to-transparent text-white ring-1 ring-inset ring-spark-400/30" : childActive ? "text-white" : "text-ink-300 hover:bg-white/[0.06] hover:text-white"
        )}
      >
        {isActive && !depth && <span className="absolute -left-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-spark-grad shadow-glow" aria-hidden="true" />}
        {Icon && (
          <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors", isActive ? "bg-spark-grad text-white shadow-glow" : "bg-white/[0.06] text-ink-300 group-hover:text-white")}>
            <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.note && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-300">{item.note}</span>}
        {item.badge > 0 && <span className="tabular rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-[18px] text-white">{item.badge > 99 ? "99+" : item.badge}</span>}
        {hasKids && <LuChevronDown className={cx("h-4 w-4 shrink-0 text-ink-400 transition-transform", open && "rotate-180")} aria-hidden="true" />}
      </button>
      {hasKids && open && (
        <ul className="ml-[18px] mt-1 space-y-0.5 border-l border-white/10 pl-2">
          {item.children.map((c) => (
            <NavItem key={c.id} item={c} active={active} onSelect={onSelect} depth={1} />
          ))}
        </ul>
      )}
    </li>
  );
}

const today = () => new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/**
 * groups: [{ label?, items: [{ id, label, icon, badge?, note?, children? }] }]
 * bottomTabs (phone): [{ id, label, icon, badge? }]
 */
export default function AppShell({ brand, groups, active, onSelect, user, onLogout, title, subtitle, actions, bottomTabs, children, wide }) {
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const select = (id) => {
    setDrawer(false);
    onSelect(id);
  };

  const sidebar = (
    <div className="relative flex h-full flex-col overflow-hidden bg-ink-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(400px_260px_at_0%_0%,rgba(255,106,26,.22),transparent_70%),radial-gradient(300px_300px_at_100%_100%,rgba(34,205,239,.12),transparent_70%)]" aria-hidden="true" />
      <div className="relative flex h-[72px] shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <SparkMark size={38} />
        <div className="min-w-0 leading-none">
          <p className="truncate font-display text-[26px] font-extrabold uppercase italic tracking-wide">{brand.name}</p>
          {brand.sub && <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.22em] text-spark-300">{brand.sub}</p>}
        </div>
        <button type="button" onClick={() => setDrawer(false)} className="ml-auto rounded-md p-1.5 text-ink-300 hover:bg-white/10 md:hidden" aria-label="Close menu">
          <LuX className="h-5 w-5" />
        </button>
      </div>

      <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 py-6" aria-label="Main">
        {groups.map((g, i) => (
          <div key={g.label || i}>
            {g.label && <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.22em] text-ink-500">{g.label}</p>}
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <NavItem key={it.id} item={it} active={active} onSelect={select} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="relative shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-2.5 py-2.5 ring-1 ring-inset ring-white/10">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-volt-400 to-indigo-500 text-sm font-extrabold text-white">{(user?.name || "?").slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold">{user?.name || "Signed in"}</p>
            {user?.role && <p className="truncate text-[11px] text-ink-400">{user.role}</p>}
          </div>
          {onLogout && (
            <button type="button" onClick={onLogout} className="rounded-md p-2 text-ink-300 transition-colors hover:bg-white/10 hover:text-white" aria-label="Log out" title="Log out">
              <LuLogOut className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f2f3fa]">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] md:block">{sidebar}</aside>

      {/* phone drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-pop">{sidebar}</aside>
        </div>
      )}

      <div className="relative md:pl-[17rem]">
        {/* a soft glow and a faint pitch grid behind the page, so wide screens never feel empty */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(800px_320px_at_85%_-60px,rgba(255,106,26,.13),transparent_70%),radial-gradient(700px_300px_at_20%_-80px,rgba(34,205,239,.10),transparent_70%)]" aria-hidden="true" />
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-ink-100/80 bg-white/80 px-4 backdrop-blur-xl md:h-[72px] md:px-8 xl:px-10">
          <button type="button" onClick={() => setDrawer(true)} className="-ml-1 rounded-xl p-2 text-ink-600 hover:bg-ink-50 md:hidden" aria-label="Open menu">
            <LuMenu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="hidden text-[10px] font-extrabold uppercase tracking-[0.22em] text-spark-600 md:block">{brand.sub || brand.name}</p>
            <h1 className="truncate font-display text-xl font-extrabold uppercase leading-tight tracking-wide text-ink-950 md:text-2xl">{title}</h1>
            {subtitle && <p className="hidden truncate text-xs text-ink-500 md:block">{subtitle}</p>}
          </div>
          <span className="hidden items-center gap-2 rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs font-bold text-ink-600 shadow-sm lg:inline-flex">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,.8)]" aria-hidden="true" />
            {today()}
          </span>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>

        <main className={cx("relative px-4 py-6 md:px-8 md:py-8 xl:px-10", bottomTabs && "pb-24 md:pb-8")}>
          <div key={active} className="animate-fade-up w-full">
            {children}
          </div>
        </main>
      </div>

      {bottomTabs && (
        <nav className="fixed inset-x-0 bottom-0 z-20 grid border-t border-ink-100 bg-white/95 backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${bottomTabs.length + 1}, minmax(0, 1fr))` }} aria-label="Quick">
          {bottomTabs.map((t) => (
            <button key={t.id} type="button" onClick={() => select(t.id)} aria-current={active === t.id ? "page" : undefined} className={cx("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", active === t.id ? "text-spark-600" : "text-ink-400")}>
              <span className="relative">
                <t.icon className="h-5 w-5" aria-hidden="true" />
                {t.badge > 0 && <span className="absolute -right-2 -top-1.5 min-w-[1rem] rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">{t.badge > 9 ? "9+" : t.badge}</span>}
              </span>
              {t.label}
            </button>
          ))}
          <button type="button" onClick={() => setDrawer(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-500">
            <LuMenu className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        </nav>
      )}
    </div>
  );
}
