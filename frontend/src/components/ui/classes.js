// Shared Tailwind class sets so every screen looks the same. Screens that build their own markup use these;
// the richer pieces (Button, Card, Badge ...) live in ./kit.jsx.

const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-spark-500 focus-visible:ring-offset-2";
const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed";

export const btn = {
  primary: `${base} bg-spark-grad text-white shadow-glow hover:brightness-110 disabled:bg-none disabled:bg-slate-300 disabled:shadow-none disabled:text-slate-100 ${focus}`,
  secondary: `${base} border border-ink-200 bg-white text-ink-800 shadow-sm hover:bg-ink-50 hover:border-ink-300 disabled:opacity-50 ${focus}`,
  danger: `${base} bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-slate-300 ${focus}`,
  dark: `${base} bg-ink-900 text-white shadow-sm hover:bg-ink-800 disabled:bg-slate-300 ${focus}`,
  ghost: `inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50 ${focus}`,
};

export const field =
  "block w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm placeholder:text-ink-300 transition-colors focus:border-spark-500 focus:outline-none focus:ring-4 focus:ring-spark-500/15 disabled:bg-ink-50 disabled:text-ink-400";

export const label = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-500";

export const card = "rounded-2xl border border-ink-100 bg-white shadow-card";

// Colour per match stage
export const stageStyle = {
  group: "bg-ink-100 text-ink-700",
  semi: "bg-volt-100 text-volt-800",
  third_place: "bg-amber-100 text-amber-800",
  final: "bg-spark-100 text-spark-800",
};

export const stageName = {
  group: "Group",
  semi: "Semi-final",
  third_place: "Third place",
  final: "Final",
};
