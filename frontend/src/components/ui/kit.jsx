// The Spark UI kit: the few building blocks every screen is made from, so they all look like one product.
// Icons are Lucide (react-icons/lu): drawn in one weight, they take the colour of the text around them.
import { forwardRef, useEffect } from "react";
import { LuCircleAlert, LuCircleCheck, LuInfo, LuLoaderCircle, LuTriangleAlert, LuX } from "react-icons/lu";
import { fileUrl, fileUrl as photoUrl } from "../../utils/files";
import { teamCode, teamColor } from "../Scoring/scoreUtils";

const cx = (...parts) => parts.filter(Boolean).join(" ");

/* --------------------------------- buttons --------------------------------- */

const BUTTON = {
  primary: "bg-spark-grad text-white shadow-glow hover:brightness-110 active:brightness-95 disabled:bg-none disabled:bg-slate-300 disabled:shadow-none",
  secondary: "border border-ink-200 bg-white text-ink-800 shadow-sm hover:border-ink-300 hover:bg-ink-50",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-500 disabled:bg-slate-300",
  dark: "bg-ink-900 text-white shadow-sm hover:bg-ink-800 disabled:bg-slate-300",
  ghost: "text-ink-600 hover:bg-ink-100/70 hover:text-ink-900",
  soft: "bg-ink-100/70 text-ink-800 hover:bg-ink-100",
  glass: "bg-white/10 text-white ring-1 ring-inset ring-white/15 hover:bg-white/15",
};
const SIZE = { sm: "gap-1.5 px-3 py-1.5 text-[13px]", md: "gap-2 px-4 py-2.5 text-sm", lg: "gap-2 px-6 py-3.5 text-[15px]" };

export const Button = forwardRef(function Button({ variant = "primary", size = "md", icon: Icon, iconRight: IconRight, busy, className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={cx("inline-flex items-center justify-center rounded-xl font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60", BUTTON[variant], SIZE[size], className)}
    >
      {busy ? <LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {children}
      {IconRight && !busy ? <IconRight className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton({ icon: Icon, label, variant = "ghost", className, ...rest }, ref) {
  return (
    <button ref={ref} type="button" aria-label={label} title={label} {...rest} className={cx("inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors disabled:opacity-50", BUTTON[variant], className)}>
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
});

/* ---------------------------------- cards ---------------------------------- */

export const Card = ({ className, padded = true, children, ...rest }) => (
  <section {...rest} className={cx("rounded-2xl border border-ink-100 bg-white shadow-card", padded && "p-5 sm:p-6", className)}>
    {children}
  </section>
);

export const CardHeader = ({ title, subtitle, icon: Icon, actions, className }) => (
  <div className={cx("flex items-start justify-between gap-3", className)}>
    <div className="flex min-w-0 items-start gap-3">
      {Icon && (
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-spark-grad text-white shadow-glow">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold text-ink-950">{title}</h2>
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
      {eyebrow && (
        <p className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-spark-600">
          <span className="h-[3px] w-5 rounded-full bg-spark-grad" aria-hidden="true" />
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-wide text-ink-950">{title}</h1>
      {subtitle && <p className="mt-2 max-w-3xl text-sm text-ink-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

/* ---------------------------------- badges ---------------------------------- */

const TONES = {
  slate: "bg-ink-50 text-ink-700 ring-ink-200",
  green: "bg-green-50 text-green-800 ring-green-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-volt-50 text-volt-800 ring-volt-200",
  indigo: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  spark: "bg-spark-50 text-spark-800 ring-spark-200",
  dark: "bg-ink-900 text-white ring-ink-900",
};

export const Badge = ({ tone = "slate", dot, icon: Icon, className, children }) => (
  <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset", TONES[tone], className)}>
    {dot && <span className={cx("h-1.5 w-1.5 rounded-full", dot === "live" ? "animate-pulse bg-red-500" : "bg-current")} aria-hidden="true" />}
    {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
    {children}
  </span>
);

export const LiveBadge = ({ children = "Live" }) => (
  <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-0.5 text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_0_18px_rgba(239,68,68,.55)]">
    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
    {children}
  </span>
);

/* ----------------------------------- stats ----------------------------------- */

// icons on stat cards stay neutral: colour is kept for things that mean something
const STAT_TONE = {
  green: ["from-spark-500 to-amber-400", "text-spark-600"],
  blue: ["from-volt-500 to-sky-400", "text-volt-600"],
  amber: ["from-amber-500 to-yellow-400", "text-amber-600"],
  red: ["from-rose-600 to-red-400", "text-rose-600"],
  slate: ["from-ink-600 to-ink-400", "text-ink-600"],
  indigo: ["from-indigo-600 to-violet-400", "text-indigo-600"],
};

export const Stat = ({ label, value, hint, icon: Icon, tone = "green", onClick }) => {
  const Tag = onClick ? "button" : "div";
  const [grad] = STAT_TONE[tone] || STAT_TONE.green;
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={cx("group relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-5 text-left shadow-card", onClick && "transition hover:-translate-y-0.5 hover:shadow-raised")}>
      <span className={cx("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", grad)} aria-hidden="true" />
      <span className={cx("pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.08] transition group-hover:opacity-[0.14]", grad)} aria-hidden="true" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-400">{label}</p>
        {Icon && (
          <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", grad)}>
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="tabular mt-2 font-display text-4xl font-extrabold leading-none tracking-wide text-ink-950">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
    </Tag>
  );
};

/* ---------------------------------- messages ---------------------------------- */

const ALERT = {
  info: ["border-volt-200 bg-volt-50 text-volt-900", LuInfo, "text-volt-600"],
  success: ["border-green-200 bg-green-50 text-green-900", LuCircleCheck, "text-green-600"],
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
  <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white/70 px-6 py-12 text-center">
    {Icon && (
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-ink-400 ring-1 ring-ink-100">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
    )}
    <p className="mt-4 font-bold text-ink-900">{title}</p>
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

const PALETTE = ["#f04e0b", "#088cb3", "#7c3aed", "#db2777", "#059669", "#d97706", "#2563eb", "#0f766e"];
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

const logoSrc = fileUrl;

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
  <div role="tablist" className={cx("inline-flex rounded-xl bg-ink-100/70 p-1", className)}>
    {tabs.map((t) => (
      <button
        key={t.id}
        role="tab"
        type="button"
        aria-selected={value === t.id}
        onClick={() => onChange(t.id)}
        className={cx("inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-bold transition-all", value === t.id ? "bg-white text-ink-950 shadow-sm ring-1 ring-ink-100" : "text-ink-500 hover:text-ink-900")}
      >
        {t.icon && <t.icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {t.label}
        {t.count != null && <span className={cx("tabular rounded-full px-1.5 text-[11px]", value === t.id ? "bg-spark-500 text-white" : "bg-ink-200/70 text-ink-600")}>{t.count}</span>}
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
              <span className={cx("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold", done ? "bg-spark-grad text-white" : here ? "bg-white text-ink-950 ring-4 ring-spark-500/30" : "bg-white/10 text-ink-300 ring-1 ring-white/15")}>
                {done ? <LuCircleCheck className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cx("hidden text-sm font-semibold sm:inline", here ? "text-white" : done ? "text-ink-200" : "text-ink-400")}>{s.label}</span>
            </button>
            {i < steps.length - 1 && <span className={cx("h-px w-6 sm:w-10", done ? "bg-spark-500" : "bg-white/15")} aria-hidden="true" />}
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
      <div className="absolute inset-0 bg-ink-950/65 backdrop-blur-sm animate-fade-in" onClick={locked ? undefined : onClose} />
      <div className={cx("relative flex max-h-[92vh] w-full animate-pop-in flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop sm:rounded-3xl", width)}>
        <div className="relative flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-4">
          <span className="absolute inset-x-0 top-0 h-1 bg-spark-grad" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-ink-950">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          {onClose && !locked && (
            <button type="button" onClick={onClose} className="-m-1.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
              <LuX className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-ink-100 bg-ink-50/60 px-6 py-3.5">{footer}</div>}
      </div>
    </div>
  );
};

/* ------------------------------------ misc ------------------------------------ */

export const Kbd = ({ children }) => <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 shadow-[0_1px_0_#cbd5e1]">{children}</kbd>;

export const Skeleton = ({ className }) => <div className={cx("animate-pulse rounded-md bg-slate-200/70", className)} />;

export { cx };
