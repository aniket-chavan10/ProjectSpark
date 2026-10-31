import { useState } from "react";
import { btn, card, field, label } from "../ui/classes";

/** Before the first ball of an innings: the two openers and the first bowler. */
export default function InningsSetup({ inningsNumber, battingTeam, bowlingTeam, banner, onSubmit, busy }) {
  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");

  const same = strikerId && strikerId === nonStrikerId;
  const ready = strikerId && nonStrikerId && bowlerId && !same;
  const thin = battingTeam.players.length < 2 || bowlingTeam.players.length < 1;

  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="setup-title">
      {banner && <div className="mb-4 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white">{banner}</div>}
      <h2 id="setup-title" className="text-xl font-bold text-slate-900">
        {inningsNumber === 1 ? "Start the match" : "Start the second innings"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {battingTeam.name} bat. Choose the two openers and who bowls the first over.
      </p>

      {thin ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          A playing XI has not been set for one of the teams, so there is nobody to choose. Set the playing XI first.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="open-striker">
              Opener on strike
            </label>
            <select id="open-striker" className={field} value={strikerId} onChange={(e) => setStrikerId(e.target.value)}>
              <option value="">Choose…</option>
              {battingTeam.players.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="open-non">
              Opener at the other end
            </label>
            <select id="open-non" className={field} value={nonStrikerId} onChange={(e) => setNonStrikerId(e.target.value)}>
              <option value="">Choose…</option>
              {battingTeam.players.map((p) => (
                <option key={p.playerId} value={p.playerId} disabled={String(p.playerId) === strikerId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="open-bowler">
              Opening bowler ({bowlingTeam.name})
            </label>
            <select id="open-bowler" className={field} value={bowlerId} onChange={(e) => setBowlerId(e.target.value)}>
              <option value="">Choose…</option>
              {bowlingTeam.players.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {same && <p className="mt-2 text-sm text-red-600">The two openers must be different players.</p>}

      <div className="mt-6">
        <button type="button" className={btn.primary} disabled={!ready || busy || thin} onClick={() => onSubmit({ strikerId: Number(strikerId), nonStrikerId: Number(nonStrikerId), bowlerId: Number(bowlerId) })}>
          {busy ? "Saving…" : "Start scoring"}
        </button>
      </div>
    </section>
  );
}
