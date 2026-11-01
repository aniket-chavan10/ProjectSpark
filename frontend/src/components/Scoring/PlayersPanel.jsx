import { LuUserRoundX } from "react-icons/lu";
import { Card, PlayerAvatar } from "../ui/kit";

/** The two batters and the bowler: what the scorer is watching ball by ball. */
export default function PlayersPanel({ inning, onRetire, awaitingBowler }) {
  const bowler = inning.currentBowler;

  return (
    <Card padded={false} className="overflow-hidden" aria-label="Batters and bowler">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-5 py-2.5">At the crease</th>
            <th className="px-2 py-2.5 text-right">R</th>
            <th className="px-2 py-2.5 text-right">B</th>
            <th className="px-2 py-2.5 text-right">4s</th>
            <th className="px-2 py-2.5 text-right">6s</th>
            <th className="px-5 py-2.5 text-right">SR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {inning.currentBatsmen.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-5 text-center text-slate-500">
                No batter at the crease
              </td>
            </tr>
          )}
          {inning.currentBatsmen.map((b) => (
            <tr key={b.playerId} className={b.isOnStrike ? "bg-slate-50 shadow-[inset_3px_0_0_0_#374c6b]" : ""}>
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <PlayerAvatar name={b.name} photo={b.profilePicture} id={b.playerId} size={38} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{b.name}</p>
                    {b.isOnStrike ? <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">On strike</p> : <p className="text-[11px] uppercase tracking-wider text-slate-400">Non-striker</p>}
                  </div>
                </div>
              </td>
              <td className="tabular px-2 py-3 text-right text-xl font-bold text-slate-900">{b.runs}</td>
              <td className="tabular px-2 py-3 text-right text-slate-600">{b.balls}</td>
              <td className="tabular px-2 py-3 text-right text-slate-600">{b.fours}</td>
              <td className="tabular px-2 py-3 text-right text-slate-600">{b.sixes}</td>
              <td className="tabular px-5 py-3 text-right text-slate-600">{b.strikeRate}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
        {bowler ? (
          <div className="flex min-w-0 items-center gap-3">
            <PlayerAvatar name={bowler.name} photo={bowler.profilePicture} id={bowler.playerId} size={38} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">
                {bowler.name} <span className="ml-1 text-xs font-normal text-slate-500">bowling</span>
              </p>
              <p className="text-xs text-slate-600">
                <span className="tabular font-bold text-slate-900">
                  {bowler.overs}-{bowler.maidens}-{bowler.runsConceded}-{bowler.wickets}
                </span>{" "}
                · Econ {bowler.economy}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{awaitingBowler ? "Choose the next bowler" : "No bowler yet"}</p>
        )}
        {inning.currentBatsmen.length > 0 && onRetire && (
          <button type="button" onClick={onRetire} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-800">
            <LuUserRoundX className="h-4 w-4" aria-hidden="true" />
            Batter retires
          </button>
        )}
      </div>
    </Card>
  );
}
