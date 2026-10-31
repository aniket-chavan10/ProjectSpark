import { card } from "../ui/classes";
import { overChips } from "./scoreUtils";

const CHIP = {
  dot: "bg-slate-200 text-slate-600",
  run: "bg-white text-slate-900 ring-1 ring-slate-300",
  four: "bg-sky-600 text-white",
  six: "bg-violet-600 text-white",
  wicket: "bg-red-600 text-white",
  extra: "bg-amber-200 text-amber-900",
};

/** The two batters, the bowler and the balls of this over. */
export default function PlayersPanel({ inning, onRetire, awaitingBowler }) {
  const chips = overChips(inning);
  const bowler = inning.currentBowler;

  return (
    <section className={`${card} overflow-hidden`} aria-label="Batters and bowler">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-2">Batter</th>
            <th className="px-2 py-2 text-right">R</th>
            <th className="px-2 py-2 text-right">B</th>
            <th className="px-2 py-2 text-right">4s</th>
            <th className="px-2 py-2 text-right">6s</th>
            <th className="px-4 py-2 text-right">SR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {inning.currentBatsmen.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-4 text-center text-slate-500">
                No batter at the crease
              </td>
            </tr>
          )}
          {inning.currentBatsmen.map((b) => (
            <tr key={b.playerId} className={b.isOnStrike ? "bg-emerald-50/60" : ""}>
              <td className="px-4 py-3 font-semibold text-slate-900">
                {b.name}
                {b.isOnStrike && <span className="ml-1.5 text-emerald-600" title="On strike">🏏</span>}
              </td>
              <td className="px-2 py-3 text-right text-lg font-bold tabular-nums">{b.runs}</td>
              <td className="px-2 py-3 text-right tabular-nums text-slate-600">{b.balls}</td>
              <td className="px-2 py-3 text-right tabular-nums text-slate-600">{b.fours}</td>
              <td className="px-2 py-3 text-right tabular-nums text-slate-600">{b.sixes}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-600">{b.strikeRate}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {inning.currentBatsmen.length > 0 && onRetire && (
        <div className="border-t border-slate-100 px-4 py-2 text-right">
          <button type="button" onClick={onRetire} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
            Batter retires…
          </button>
        </div>
      )}

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {bowler ? (
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-900">
                {bowler.name} <span className="ml-1 text-xs font-normal text-slate-500">bowling</span>
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold tabular-nums text-slate-900">
                  {bowler.overs}-{bowler.maidens}-{bowler.runsConceded}-{bowler.wickets}
                </span>{" "}
                · Econ {bowler.economy}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">{awaitingBowler ? "Choose the next bowler" : "No bowler yet"}</div>
          )}
          <div className="flex items-center gap-1.5" aria-label={bowler ? "This over" : "Last over"}>
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{bowler ? "This over" : "Last over"}</span>
            {chips.length === 0 && <span className="text-xs text-slate-400">—</span>}
            {chips.map((c, i) => (
              <span key={i} className={`flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-sm font-bold ${CHIP[c.kind]}`}>
                {c.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
