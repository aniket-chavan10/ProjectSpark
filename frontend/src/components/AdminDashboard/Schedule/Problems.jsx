import React from "react";
import { LuCircleX, LuTriangleAlert } from "react-icons/lu";
import { card } from "../../ui/classes";

// All the matches that do not fit are reported as one problem, not one line each
const summarize = (errors) => {
  const outside = errors.filter((e) => e.code === "outside_dates");
  if (outside.length < 2) return errors;
  const nos = outside.map((e) => e.matchNo);
  const merged = {
    code: "outside_dates",
    matchNo: nos[0],
    message: `${outside.length} matches (${nos.slice(0, 6).join(", ")}${nos.length > 6 ? "…" : ""}) do not fit on your tournament days. Give the days more playing time, shorten the gap, or play fewer overs.`,
  };
  return [merged, ...errors.filter((e) => e.code !== "outside_dates")];
};

/** What is wrong with the schedule. Click one to jump to the match. */
export default function Problems({ errors: rawErrors = [], warnings = [], onFocus }) {
  const errors = summarize(rawErrors);
  if (!errors.length && !warnings.length) return null;
  const Item = ({ p, tone }) => (
    <li>
      <button
        type="button"
        onClick={() => onFocus({ matchNo: p.matchNo, at: Date.now() })}
        className={`w-full rounded-md px-3 py-2 text-left text-sm transition hover:brightness-95 ${
          tone === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
        }`}
      >
        <span className="mr-2" aria-hidden="true">
          {tone === "error" ? <LuCircleX className="h-4 w-4" aria-hidden="true" /> : <LuTriangleAlert className="h-4 w-4" aria-hidden="true" />}
        </span>
        {p.message}
      </button>
    </li>
  );
  return (
    <section className={`${card} p-4`} aria-label="Problems with the schedule">
      {errors.length > 0 && (
        <>
          <h3 className="mb-2 text-sm font-semibold text-red-700">
            {errors.length} {errors.length === 1 ? "problem to fix" : "problems to fix"} before saving
          </h3>
          <ul className="space-y-1.5">
            {errors.slice(0, 8).map((p, i) => (
              <Item key={`e${i}`} p={p} tone="error" />
            ))}
          </ul>
          {errors.length > 8 && <p className="mt-2 text-xs text-slate-500">…and {errors.length - 8} more.</p>}
        </>
      )}
      {warnings.length > 0 && (
        <>
          <h3 className={`${errors.length ? "mt-4" : ""} mb-2 text-sm font-semibold text-amber-800`}>
            {warnings.length} {warnings.length === 1 ? "thing to look at" : "things to look at"} (you can still save)
          </h3>
          <ul className="space-y-1.5">
            {warnings.slice(0, 6).map((p, i) => (
              <Item key={`w${i}`} p={p} tone="warning" />
            ))}
          </ul>
          {warnings.length > 6 && <p className="mt-2 text-xs text-slate-500">…and {warnings.length - 6} more.</p>}
        </>
      )}
    </section>
  );
}
