// Shared Tailwind class sets so every screen looks the same.

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
};

export const field =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-slate-100";

export const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export const card = "rounded-xl border border-slate-200 bg-white shadow-sm";

// Colour per match stage
export const stageStyle = {
  group: "bg-slate-100 text-slate-700",
  semi: "bg-indigo-100 text-indigo-700",
  third_place: "bg-amber-100 text-amber-800",
  final: "bg-emerald-100 text-emerald-800",
};

export const stageName = {
  group: "Group",
  semi: "Semi-final",
  third_place: "Third place",
  final: "Final",
};
