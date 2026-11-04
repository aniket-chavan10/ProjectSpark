// The pieces the scoring console is built from. It is a work tool used for hours, so it is flat and quiet:
// graphite panels, one accent colour for the thing to do next, and big plain numbers. Nothing moves unless something happened.
import { LuX } from "react-icons/lu";
import { cx } from "../ui/kit";

/** The ball chips: a dot is quiet, a four and a six are coloured, a wicket is red. */
export const CHIP = {
  dot: "bg-zinc-800 text-zinc-400 ring-1 ring-inset ring-zinc-600",
  run: "bg-white text-zinc-900",
  four: "bg-sky-500 text-white",
  six: "bg-violet-500 text-white",
  wicket: "bg-red-600 text-white",
  extra: "bg-amber-400 text-amber-950",
};

export const BallChip = ({ c, size = 32 }) => (
  <span style={{ minWidth: size, height: size, fontSize: c.text.length > 2 ? size * 0.38 : size * 0.52 }} className={cx("inline-flex items-center justify-center rounded-full px-1.5 font-display font-bold leading-none", CHIP[c.kind])}>
    {c.text}
  </span>
);

/** A block of the console: a small title bar and the content. */
export function Section({ title, aside, children, className, bodyClass }) {
  return (
    <section className={cx("flex min-h-0 flex-col rounded-lg border border-zinc-800 bg-zinc-900", className)}>
      {(title || aside) && (
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-800 px-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{title}</h2>
          {aside}
        </div>
      )}
      <div className={cx("min-h-0 flex-1", bodyClass)}>{children}</div>
    </section>
  );
}

export const Kbd = ({ children }) => <kbd className="rounded bg-zinc-950 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-400 ring-1 ring-inset ring-zinc-700">{children}</kbd>;

/**
 * The frame of every decision that takes over the middle of the console (wicket, new batter, next bowler ...).
 * It is not a pop-up: the score and the players stay in view on either side, and nothing is dimmed.
 */
export function ActionShell({ tone = "neutral", title, subtitle, onBack, backLabel = "Cancel", summary, children, footer }) {
  const bar = { neutral: "bg-zinc-700", danger: "bg-red-600", accent: "bg-spark-500", amber: "bg-amber-500" }[tone];
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900" aria-label={title}>
      <div className={cx("h-1 shrink-0", bar)} aria-hidden="true" />
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-zinc-400">{subtitle}</p>}
        </div>
        {onBack && (
          <button type="button" onClick={onBack} className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white">
            <LuX className="h-4 w-4" aria-hidden="true" /> {backLabel} <Kbd>Esc</Kbd>
          </button>
        )}
      </header>
      {summary && <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/40 px-4 py-2.5">{summary}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2.5">{children}</div>
      {footer && <footer className="shrink-0 border-t border-zinc-800 bg-zinc-950/40 px-4 py-2.5">{footer}</footer>}
    </section>
  );
}

/** A flat button for the console. */
const BTN = {
  primary: "bg-spark-600 text-white hover:bg-spark-500 disabled:bg-zinc-800 disabled:text-zinc-500",
  danger: "bg-red-600 text-white hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500",
  secondary: "bg-zinc-800 text-zinc-100 ring-1 ring-inset ring-zinc-700 hover:bg-zinc-700 disabled:text-zinc-500",
  ghost: "text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:text-zinc-600",
};
export function CButton({ variant = "secondary", size = "md", icon: Icon, className, children, ...rest }) {
  return (
    <button type="button" {...rest} className={cx("inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed", size === "lg" ? "h-11 px-5 text-sm" : "h-9 px-3.5 text-[13px]", BTN[variant], className)}>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** One of several choices (a toggle button). */
export const Choice = ({ on, onClick, disabled, title, children, className, tone = "accent" }) => (
  <button
    type="button"
    aria-pressed={on}
    disabled={disabled}
    title={title}
    onClick={onClick}
    className={cx(
      "rounded-md border px-3 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-spark-500 disabled:cursor-not-allowed disabled:opacity-35",
      on ? (tone === "danger" ? "border-red-500 bg-red-600 text-white" : "border-spark-500 bg-spark-600 text-white") : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-700",
      className
    )}
  >
    {children}
  </button>
);

export const Label = ({ children, className }) => <h3 className={cx("mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500", className)}>{children}</h3>;
