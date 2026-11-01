// The frame of every signed-in area: a dark navy sidebar with line icons, a slim top bar, the page, and on a
// phone a drawer plus an optional bottom tab bar. Team admin and association both use it, so they feel alike.
import { useEffect, useState } from "react";
import { LuChevronDown, LuLogOut, LuMenu, LuX, LuZap } from "react-icons/lu";
import { cx } from "../ui/kit";

export const SparkMark = ({ size = 32 }) => (
  <span style={{ width: size, height: size }} className="inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-900/40">
    <LuZap style={{ width: size * 0.56, height: size * 0.56 }} aria-hidden="true" />
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
          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] font-medium transition-colors",
          depth ? "pl-4" : "",
          isActive ? "bg-white/10 text-white" : childActive ? "text-white" : "text-ink-300 hover:bg-white/5 hover:text-white"
        )}
      >
        {isActive && !depth && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-emerald-400" aria-hidden="true" />}
        {Icon && <Icon className={cx("h-[18px] w-[18px] shrink-0", isActive ? "text-emerald-300" : "text-ink-400 group-hover:text-ink-200")} aria-hidden="true" />}
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
    <div className="flex h-full flex-col bg-ink-950 text-white">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <SparkMark />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-bold tracking-tight">{brand.name}</p>
          {brand.sub && <p className="truncate text-[11px] font-medium uppercase tracking-wider text-ink-400">{brand.sub}</p>}
        </div>
        <button type="button" onClick={() => setDrawer(false)} className="ml-auto rounded-md p-1.5 text-ink-300 hover:bg-white/10 md:hidden" aria-label="Close menu">
          <LuX className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5" aria-label="Main">
        {groups.map((g, i) => (
          <div key={g.label || i}>
            {g.label && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{g.label}</p>}
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <NavItem key={it.id} item={it} active={active} onSelect={select} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-700 text-sm font-bold text-ink-100">{(user?.name || "?").slice(0, 1).toUpperCase()}</span>
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
    <div className="min-h-screen bg-slate-50">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 md:block">{sidebar}</aside>

      {/* phone drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-pop">{sidebar}</aside>
        </div>
      )}

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:h-16 md:px-8">
          <button type="button" onClick={() => setDrawer(true)} className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Open menu">
            <LuMenu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold text-slate-900 md:text-base">{title}</h1>
            {subtitle && <p className="hidden truncate text-xs text-slate-500 md:block">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>

        <main className={cx("px-4 py-6 md:px-8 md:py-8", bottomTabs && "pb-24 md:pb-8")}>
          <div key={active} className={cx("animate-fade-up mx-auto", wide ? "max-w-[1400px]" : "max-w-7xl")}>
            {children}
          </div>
        </main>
      </div>

      {bottomTabs && (
        <nav className="fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200 bg-white md:hidden" style={{ gridTemplateColumns: `repeat(${bottomTabs.length + 1}, minmax(0, 1fr))` }} aria-label="Quick">
          {bottomTabs.map((t) => (
            <button key={t.id} type="button" onClick={() => select(t.id)} aria-current={active === t.id ? "page" : undefined} className={cx("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", active === t.id ? "text-emerald-700" : "text-slate-500")}>
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
