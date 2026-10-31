import React, { useEffect, useState } from "react";
import api from "../../../api/tournamentApi1";
import { card } from "../../ui/classes";

const PLACES = [
  { position: 1, name: "1st", medal: "🥇" },
  { position: 2, name: "2nd", medal: "🥈" },
  { position: 3, name: "3rd", medal: "🥉" },
  { position: 4, name: "4th", medal: "4" },
];

/** Final positions. 3rd and 4th come from the third-place match, or from the semi-final losers when no such match was scheduled. */
export default function Standings({ tournamentId, matches }) {
  const [data, setData] = useState(null);

  // reload whenever a match result changes
  const completed = (matches || []).filter((m) => m.status === "completed").length;
  useEffect(() => {
    let cancelled = false;
    api
      .getStandings(tournamentId)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData(null));
    return () => {
      cancelled = true;
    };
  }, [tournamentId, completed]);

  if (!data || !data.positions.length) return null;
  const byPos = Object.fromEntries(data.positions.map((p) => [p.position, p]));

  return (
    <section className={`${card} p-4 sm:p-5`} aria-label="Final positions">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Final positions</h3>
      <ol className="grid gap-2 sm:grid-cols-4">
        {PLACES.map((pl) => {
          const p = byPos[pl.position];
          return (
            <li key={pl.position} className={`rounded-lg px-3 py-3 ${p ? "bg-emerald-50" : "bg-slate-50"}`}>
              <div className="text-xs font-semibold text-slate-500">
                {pl.medal} {pl.name} place
              </div>
              <div className={`mt-0.5 text-sm font-semibold ${p ? "truncate text-slate-900" : "text-slate-400"}`}>
                {p ? p.teamName : data.hasThirdPlaceMatch && pl.position > 2 ? <span className="text-xs font-medium">Decided by the third-place match</span> : "—"}
              </div>
              {p && p.decidedBy === "semi_final_loser" && <div className="text-xs text-slate-500">Lost the semi-final to {pl.position === 3 ? "the champion" : "the runner-up"}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
