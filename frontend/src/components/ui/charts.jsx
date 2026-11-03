import { useEffect, useRef, useState } from "react";
import { cx } from "./kit";

// Small charts for the dashboards. One hue (the brand's spark orange) because each chart shows one measure:
// thin columns with a rounded data end, hairline grid, the value on hover or focus, and a table for anyone who wants the numbers.

const niceMax = (v) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 4, 10].find((k) => k * p >= v) || 10) * p;
};

const DEFAULT_W = 560;
const PAD = { l: 34, r: 8, t: 16, b: 26 };

/**
 * Columns over time (or any short list of categories).
 *   data  [{ label, value }]      unit  what one unit is ("matches"), used in the tooltip and the table
 */
export function ColumnChart({ data, unit = "", height = 190, className, empty = "Nothing to show yet" }) {
  const [hover, setHover] = useState(null);
  // draw at the real width so the text stays a readable size instead of shrinking with the picture
  const box = useRef(null);
  const [W, setW] = useState(DEFAULT_W);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const measure = () => el.clientWidth && setW(Math.max(240, Math.round(el.clientWidth)));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const total = data.reduce((n, d) => n + d.value, 0);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const band = plotW / Math.max(data.length, 1);
  const bar = Math.min(24, band * 0.55);
  const y = (v) => PAD.t + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const last = data.length - 1;

  return (
    <figure ref={box} className={cx("relative", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label={`${unit || "Values"} by ${data.map((d) => d.label).join(", ")}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="stroke-ink-100" strokeWidth="1" />
            <text x={PAD.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-ink-400 text-[11px] font-semibold" style={{ fontSize: 11 }}>
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PAD.l + band * i + (band - bar) / 2;
          const h = Math.max((d.value / max) * plotH, d.value > 0 ? 3 : 0);
          const r = Math.min(4, h);
          const on = hover === i;
          return (
            <g key={d.label + i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${d.label}: ${d.value} ${unit}`} className="outline-none">
              <rect x={PAD.l + band * i} y={PAD.t} width={band} height={plotH + PAD.b} fill="transparent" />
              {d.value > 0 && (
                // rounded at the top, square on the baseline
                <path d={`M${x},${PAD.t + plotH} V${PAD.t + plotH - h + r} Q${x},${PAD.t + plotH - h} ${x + r},${PAD.t + plotH - h} H${x + bar - r} Q${x + bar},${PAD.t + plotH - h} ${x + bar},${PAD.t + plotH - h + r} V${PAD.t + plotH} Z`} className={on ? "fill-spark-600" : "fill-spark-500"} />
              )}
              {d.value > 0 && (i === last || on) && (
                <text x={x + bar / 2} y={PAD.t + plotH - h - 6} textAnchor="middle" className="fill-ink-900" style={{ fontSize: 12, fontWeight: 800 }}>
                  {d.value}
                </text>
              )}
              <text x={x + bar / 2} y={H - 8} textAnchor="middle" className={on ? "fill-ink-900" : "fill-ink-500"} style={{ fontSize: 11, fontWeight: 600 }}>
                {d.label}
              </text>
            </g>
          );
        })}
        <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} className="stroke-ink-200" strokeWidth="1" />
      </svg>

      {hover != null && (
        <div className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-ink-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-raised" style={{ left: `${((PAD.l + band * hover + band / 2) / W) * 100}%`, top: 0 }} role="status">
          {data[hover].label}: <b>{data[hover].value}</b> {unit}
        </div>
      )}
      {total === 0 && <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm font-medium text-ink-400">{empty}</p>}

      <details className="mt-1 text-xs text-ink-500">
        <summary className="cursor-pointer select-none font-semibold hover:text-ink-800">View as a table</summary>
        <table className="mt-2 w-full max-w-xs text-left">
          <tbody>
            {data.map((d, i) => (
              <tr key={d.label + i} className="border-t border-ink-100">
                <th className="py-1 pr-4 font-semibold text-ink-700">{d.label}</th>
                <td className="tabular py-1 text-right">
                  {d.value} {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** A labelled meter: "Diwali Cup  6 of 15" with a bar. */
export function Meter({ label, value, max, note, className }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold text-ink-900">{label}</span>
        <span className="tabular shrink-0 text-xs font-semibold text-ink-500">{note || `${value} of ${max}`}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className="h-full rounded-full bg-spark-grad" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
