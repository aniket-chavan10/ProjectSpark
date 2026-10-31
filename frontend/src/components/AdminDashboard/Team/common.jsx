// Small pieces shared by the team admin screens (players and squads). Built for a phone first.
import React from "react";
import { photoUrl } from "../../../api/teamAdminApi";

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

export const Avatar = ({ name, photo, size = 40 }) => {
  const src = photoUrl(photo);
  const style = { width: size, height: size, minWidth: size };
  return src ? (
    <img src={src} alt="" style={style} className="rounded-full bg-slate-200 object-cover" />
  ) : (
    <span style={style} className="inline-flex items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800" aria-hidden="true">
      {initials(name) || "?"}
    </span>
  );
};

const tones = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
};

export const Banner = ({ tone = "info", children, onClose }) => (
  <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${tones[tone]}`}>
    <div className="min-w-0 flex-1">{children}</div>
    {onClose && (
      <button type="button" onClick={onClose} className="-m-1 p-1 text-lg leading-none opacity-60 hover:opacity-100" aria-label="Dismiss">
        ×
      </button>
    )}
  </div>
);

export const Spinner = ({ label = "Loading…" }) => (
  <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500" role="status">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" aria-hidden="true" />
    {label}
  </div>
);

export const Pill = ({ tone = "slate", children }) => {
  const map = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    blue: "bg-sky-100 text-sky-800",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
};

export const Empty = ({ icon = "🏏", title, children }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
    <div className="text-3xl" aria-hidden="true">{icon}</div>
    <p className="mt-2 font-semibold text-slate-800">{title}</p>
    {children && <p className="mt-1 text-sm text-slate-500">{children}</p>}
  </div>
);

/** A full-screen sheet on a phone, a centred dialog on a bigger screen. */
export const Sheet = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
    <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <button type="button" onClick={onClose} className="-m-2 p-2 text-2xl leading-none text-slate-500 hover:text-slate-800" aria-label="Close">
          ×
        </button>
      </div>
      <div className="overflow-y-auto p-4">{children}</div>
    </div>
  </div>
);
