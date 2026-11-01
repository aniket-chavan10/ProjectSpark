// The Spark UI kit: the few building blocks every screen is made from, so they all look like one product.
// Icons are Lucide (react-icons/lu): drawn in one weight, they take the colour of the text around them.
import { forwardRef, useEffect } from "react";
import { LuCircleAlert, LuCircleCheck, LuInfo, LuLoaderCircle, LuTriangleAlert, LuX } from "react-icons/lu";
import { photoUrl } from "../../api/teamAdminApi";
import { teamCode, teamColor } from "../Scoring/scoreUtils";
import { apiOrigin } from "../../api/matchSocket";

const cx = (...parts) => parts.filter(Boolean).join(" ");

/* --------------------------------- buttons --------------------------------- */

const BUTTON = {
  primary: "bg-ink-900 text-white shadow-sm hover:bg-ink-800 active:bg-ink-950 disabled:bg-slate-300",
  secondary: "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-slate-300",
  dark: "bg-ink-900 text-white shadow-sm hover:bg-ink-800 disabled:bg-slate-300",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  soft: "bg-slate-100 text-slate-800 hover:bg-slate-200",
};
const SIZE = { sm: "gap-1.5 px-3 py-1.5 text-[13px]", md: "gap-2 px-4 py-2.5 text-sm", lg: "gap-2 px-6 py-3 text-base" };

export const Button = forwardRef(function Button({ variant = "primary", size = "md", icon: Icon, iconRight: IconRight, busy, className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={cx("inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60", BUTTON[variant], SIZE[size], className)}
    >
      {busy ? <LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {children}
      {IconRight && !busy ? <IconRight className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton({ icon: Icon, label, variant = "ghost", className, ...rest }, ref) {
  return (
    <button ref={ref} type="button" aria-label={label} title={label} {...rest} className={cx("inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-50", BUTTON[variant], className)}>
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
});

/* ---------------------------------- cards ---------------------------------- */

export const Card = ({ className, padded = true, children, ...rest }) => (
  <section {...rest} className={cx("rounded-xl border border-slate-200 bg-white shadow-card", padded && "p-5", className)}>
    {children}
  </section>
);

export const CardHeader = ({ title, subtitle, icon: Icon, actions, className }) => (
  <div className={cx("flex items-start justify-between gap-3", className)}>
    <div className="flex min-w-0 items-start gap-3">
      {Icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

export const PageHeader = ({ title, subtitle, actions, eyebrow, back }) => (
  <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {back}
      {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{eyebrow}</p>}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

/* ---------------------------------- badges ---------------------------------- */

const TONES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-slate-50 text-slate-700 ring-slate-300",
  amber: "bg-amber-50/60 text-amber-900 ring-amber-200",
  red: "bg-red-50/70 text-red-800 ring-red-200",
  blue: "bg-brand-50 text-brand-800 ring-brand-200",
  indigo: "bg-brand-50 text-brand-800 ring-brand-200",
  dark: "bg-ink-900 text-white ring-ink-900",
};

export const Badge = ({ tone = "slate", dot, icon: Icon, className, children }) => (
  <span className={cx("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", TONES[tone], className)}>
    {dot && <span className={cx("h-1.5 w-1.5 rounded-full", dot === "live" ? "animate-pulse bg-red-500" : "bg-current")} aria-hidden="true" />}
    {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
    {children}
  </span>
);

export const LiveBadge = ({ children = "Live" }) => (
  <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
    {children}
  </span>
);

/* ----------------------------------- stats ----------------------------------- */

// icons on stat cards stay neutral: colour is kept for things that mean something
const STAT_TONE = { green: "bg-slate-100 text-slate-600", blue: "bg-slate-100 text-slate-600", amber: "bg-slate-100 text-slate-600", red: "bg-slate-100 text-slate-600", slate: "bg-slate-100 text-slate-600", indigo: "bg-slate-100 text-slate-600" };

export const Stat = ({ label, value, hint, icon: Icon, tone = "green", onClick }) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={cx("rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card", onClick && "transition hover:border-slate-300 hover:shadow-raised")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg", STAT_TONE[tone])}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="tabular mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Tag>
  );
};

/* ---------------------------------- messages ---------------------------------- */

const ALERT = {
  info: ["border-brand-200 bg-brand-50 text-brand-900", LuInfo, "text-brand-600"],
  success: ["border-slate-200 bg-slate-50 text-slate-900", LuCircleCheck, "text-slate-600"],
  warn: ["border-amber-200 bg-amber-50 text-amber-900", LuTriangleAlert, "text-amber-600"],
  error: ["border-red-200 bg-red-50 text-red-900", LuCircleAlert, "text-red-600"],
};

export const Alert = ({ tone = "info", title, children, onClose, className }) => {
  const [box, Icon, iconColor] = ALERT[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", box, className)}>
      <Icon className={cx("mt-0.5 h-4 w-4 shrink-0", iconColor)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" className="-m-1 rounded p-1 opacity-60 hover:opacity-100">
          <LuX className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export const Spinner = ({ label = "Loading…", className }) => (
  <div className={cx("flex items-center justify-center gap-3 py-14 text-sm text-slate-500", className)} role="status">
    <LuLoaderCircle className="h-5 w-5 animate-spin text-emerald-600" aria-hidden="true" />
    {label}
  </div>
);

export const EmptyState = ({ icon: Icon, title, children, action }) => (
  <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    {Icon && (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
    )}
    <p className="mt-4 font-semibold text-slate-900">{title}</p>
    {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ------------------------------- people and teams ------------------------------- */

const initialsOf = (name = "") =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

const PALETTE = ["#5a6b86", "#64748b", "#52667a", "#6b6f86", "#5f7385", "#6a7a8c", "#586274", "#707a8a"];
const fromPalette = (seed) => PALETTE[Math.abs(Number(seed) || String(seed ?? "").length) % PALETTE.length];

/** A player's photo, or their initials on a coloured disc. */
export const PlayerAvatar = ({ name, photo, size = 40, ring, id, className }) => {
  const src = photoUrl(photo);
  const style = { width: size, height: size, minWidth: size, fontSize: Math.max(10, Math.round(size * 0.36)) };
  const ringClass = ring ? "ring-2 ring-white shadow" : "";
  return src ? (
    <img src={src} alt="" loading="lazy" style={style} className={cx("rounded-full bg-slate-200 object-cover", ringClass, className)} />
  ) : (
    <span style={{ ...style, background: fromPalette(id ?? name) }} className={cx("inline-flex items-center justify-center rounded-full font-bold text-white", ringClass, className)} aria-hidden="true">
      {initialsOf(name) || "?"}
    </span>
  );
};

const logoSrc = (logo) => (!logo ? null : /^https?:/.test(logo) ? logo : `${apiOrigin()}/${String(logo).replace(/\\/g, "/").replace(/^\/+/, "")}`);

/** A team's logo, or its code on its colour. */
export const TeamLogo = ({ team, size = 40, className, rounded = "full" }) => {
  const name = team.team_name || team.name || "";
  const src = logoSrc(team.logo);
  const r = rounded === "full" ? "rounded-full" : "rounded-xl";
  return src ? (
    <img src={src} alt={name} loading="lazy" style={{ width: size, height: size, minWidth: size }} className={cx(r, "bg-white object-cover ring-1 ring-slate-200", className)} />
  ) : (
    <span style={{ width: size, height: size, minWidth: size, fontSize: Math.round(size * 0.34), background: teamColor(team.id) }} className={cx("inline-flex items-center justify-center font-extrabold text-white", r, className)} aria-label={name}>
      {teamCode(name)}
    </span>
  );
};

/* ------------------------------------ tabs ------------------------------------ */

export const Tabs = ({ tabs, value, onChange, className }) => (
  <div role="tablist" className={cx("inline-flex rounded-lg bg-slate-100 p-1", className)}>
    {tabs.map((t) => (
      <button
        key={t.id}
        role="tab"
        type="button"
        aria-selected={value === t.id}
        onClick={() => onChange(t.id)}
        className={cx("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors", value === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
      >
        {t.icon && <t.icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {t.label}
        {t.count != null && <span className="tabular rounded bg-slate-200/70 px-1.5 text-[11px] text-slate-600">{t.count}</span>}
      </button>
    ))}
  </div>
);

/* ----------------------------------- stepper ----------------------------------- */

/** steps: [{ id, label }]  current: id  */
export const Stepper = ({ steps, current, onSelect, className }) => {
  const at = steps.findIndex((s) => s.id === current);
  return (
    <ol className={cx("flex items-center gap-2", className)} aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < at;
        const here = i === at;
        const clickable = onSelect && (done || here);
        return (
          <li key={s.id} className="flex items-center gap-2" aria-current={here ? "step" : undefined}>
            <button type="button" disabled={!clickable} onClick={() => clickable && onSelect(s.id)} className={cx("flex items-center gap-2.5 rounded-lg py-1 pr-2", clickable ? "cursor-pointer" : "cursor-default")}>
              <span className={cx("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold", done ? "bg-emerald-600 text-white" : here ? "bg-ink-900 text-white" : "bg-slate-200 text-slate-500")}>
                {done ? <LuCircleCheck className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cx("hidden text-sm font-semibold sm:inline", here ? "text-slate-900" : done ? "text-slate-700" : "text-slate-400")}>{s.label}</span>
            </button>
            {i < steps.length - 1 && <span className={cx("h-px w-6 sm:w-10", done ? "bg-emerald-500" : "bg-slate-300")} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
};

/* ----------------------------------- dialog ----------------------------------- */

/** A centred dialog (a bottom sheet on a phone). Escape and a click outside close it. */
export const Dialog = ({ title, subtitle, onClose, footer, children, width = "max-w-lg", locked }) => {
  useEffect(() => {
    if (locked) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, locked]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px]" onClick={locked ? undefined : onClose} />
      <div className={cx("relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-pop sm:rounded-2xl", width)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          {onClose && !locked && (
            <button type="button" onClick={onClose} className="-m-1.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
              <LuX className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
};

/* ------------------------------------ misc ------------------------------------ */

export const Kbd = ({ children }) => <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 shadow-[0_1px_0_#cbd5e1]">{children}</kbd>;

export const Skeleton = ({ className }) => <div className={cx("animate-pulse rounded-md bg-slate-200/70", className)} />;

export { cx };
