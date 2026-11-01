// Shared Tailwind class sets so every screen looks the same. Screens that build their own markup use these;
// the richer pieces (Button, Card, Badge ...) live in ./kit.jsx.

const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2";
const base = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed";

export const btn = {
  primary: `${base} bg-ink-900 text-white shadow-sm hover:bg-ink-800 active:bg-ink-950 disabled:bg-slate-300 disabled:text-slate-100 ${focus}`,
  secondary: `${base} border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 ${focus}`,
  danger: `${base} bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-slate-300 ${focus}`,
  dark: `${base} bg-ink-900 text-white shadow-sm hover:bg-ink-800 disabled:bg-slate-300 ${focus}`,
  ghost: `inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50 ${focus}`,
};

export const field =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:bg-slate-100 disabled:text-slate-500";

export const label = "mb-1.5 block text-xs font-semibold text-slate-600";

export const card = "rounded-xl border border-slate-200 bg-white shadow-card";

// Colour per match stage
export const stageStyle = {
  group: "bg-slate-100 text-slate-700",
  semi: "bg-brand-100 text-brand-700",
  third_place: "bg-amber-100 text-amber-800",
  final: "bg-emerald-100 text-emerald-800",
};

export const stageName = {
  group: "Group",
  semi: "Semi-final",
  third_place: "Third place",
  final: "Final",
};
