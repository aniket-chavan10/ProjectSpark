import { cx } from "./kit";

/**
 * The banner at the top of a home screen: a floodlit stadium panel with running light lines.
 * `aside` is for the numbers that sit on the right (see HeroStat); `actions` are the buttons under the text.
 */
export default function Hero({ eyebrow, title, subtitle, actions, aside, leading, className }) {
  return (
    <section className={cx("relative overflow-hidden rounded-3xl bg-stadium text-white shadow-raised ring-1 ring-white/10", className)}>
      <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-60 [background-size:44px_44px] [mask-image:linear-gradient(110deg,black,transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-spark-500/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-10 left-0 h-16 w-3/5 -skew-x-12 overflow-hidden opacity-60" aria-hidden="true">
        <div className="run-stripes h-full w-full bg-gradient-to-r from-spark-600/60 via-spark-500/20 to-transparent" />
      </div>
      <div className="pointer-events-none absolute right-0 top-8 h-8 w-2/5 -skew-x-12 overflow-hidden opacity-50" aria-hidden="true">
        <div className="run-stripes h-full w-full bg-gradient-to-l from-volt-500/60 via-volt-500/10 to-transparent" />
      </div>
      <div className="relative grid items-center gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:p-10">
        <div className="flex min-w-0 items-center gap-5">
          {leading}
          <div className="min-w-0">
            {eyebrow && (
              <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-spark-300">
                <span className="h-0.5 w-6 bg-spark-grad" aria-hidden="true" />
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1.5 font-display text-4xl font-extrabold uppercase leading-[1.02] tracking-wide sm:text-5xl 2xl:text-6xl">{title}</h1>
            {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-ink-200">{subtitle}</p>}
            {actions && <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
        </div>
        {aside && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[22rem] xl:grid-cols-2 min-[1800px]:min-w-[34rem] min-[1800px]:grid-cols-4">{aside}</div>}
      </div>
    </section>
  );
}

/** A number on the banner: glass tile, big display figure. Clickable when it has an onClick. */
export function HeroStat({ label, value, hint, icon: Icon, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={cx("relative overflow-hidden rounded-2xl bg-white/[0.07] p-4 text-left ring-1 ring-inset ring-white/15 backdrop-blur", onClick && "transition hover:-translate-y-0.5 hover:bg-white/[0.12]")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-300">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-spark-300" aria-hidden="true" />}
      </div>
      <p className="tabular mt-1.5 font-display text-4xl font-extrabold leading-none tracking-wide">{value}</p>
      {hint && <p className="mt-1 truncate text-[11px] text-ink-300">{hint}</p>}
    </Tag>
  );
}
