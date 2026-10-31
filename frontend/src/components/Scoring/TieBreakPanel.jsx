import { useEffect, useState } from "react";
import { tieBreakApi } from "../../api/sparkApi";
import { btn, card, field, label } from "../ui/classes";

const METHODS = [
  { id: "super_over", name: "Super over", hint: "Enter the score of each team's super over" },
  { id: "batted_first", name: "Batted first wins", hint: "The team that batted first wins" },
  { id: "manual", name: "Pick the winner", hint: "The host decides" },
];

// Shown when a match ends level and nobody has won yet. The tournament's own rule is pre-selected.
export default function TieBreakPanel({ matchId, onDone }) {
  const [info, setInfo] = useState(null);
  const [method, setMethod] = useState("super_over");
  const [runs, setRuns] = useState({ team1Runs: "", team1Wickets: "0", team2Runs: "", team2Wickets: "0" });
  const [winner, setWinner] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    tieBreakApi
      .status(matchId)
      .then((s) => {
        setInfo(s);
        setMethod(s.rule);
      })
      .catch((e) => setError(e.message));
  }, [matchId]);

  if (!info || !info.pending) return error ? <p className="text-sm text-red-700">{error}</p> : null;
  const [t1, t2] = info.teams;
  const firstName = info.teams.find((t) => t.id === info.firstBattingTeamId);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await tieBreakApi.resolve(matchId, { method, ...runs, winnerTeamId: winner, note });
      if (onDone) onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const num = (k) => (e) => setRuns({ ...runs, [k]: e.target.value });

  return (
    <form onSubmit={submit} className={`${card} space-y-4 border-amber-300 bg-amber-50 p-5`} aria-label="Settle the tie">
      <div>
        <h2 className="text-lg font-bold text-amber-900">The match is tied</h2>
        <p className="text-sm text-amber-900">Settle it now so the winner moves on and points are given. This tournament's rule: <strong>{METHODS.find((m) => m.id === info.rule).name}</strong>.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How to settle it">
        {METHODS.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)} title={m.hint}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${method === m.id ? "bg-amber-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"}`}>
            {m.name}
          </button>
        ))}
      </div>

      {method === "super_over" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[[t1, "team1"], [t2, "team2"]].map(([t, k]) => (
            <fieldset key={k} className="rounded-lg border border-amber-200 bg-white p-3">
              <legend className="px-1 text-sm font-semibold text-slate-800">{t.name}</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label} htmlFor={`${k}-r`}>Runs</label>
                  <input id={`${k}-r`} type="number" min={0} max={200} className={field} value={runs[`${k}Runs`]} onChange={num(`${k}Runs`)} required />
                </div>
                <div>
                  <label className={label} htmlFor={`${k}-w`}>Wickets lost</label>
                  <input id={`${k}-w`} type="number" min={0} max={10} className={field} value={runs[`${k}Wickets`]} onChange={num(`${k}Wickets`)} required />
                </div>
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {method === "batted_first" && (
        <p className="rounded-lg bg-white p-3 text-sm text-slate-700">{firstName ? <><strong>{firstName.name}</strong> batted first, so they win.</> : "The first innings was not found."}</p>
      )}

      {method === "manual" && (
        <div>
          <label className={label} htmlFor="tie-winner">Winner</label>
          <select id="tie-winner" className={field} value={winner} onChange={(e) => setWinner(e.target.value)} required>
            <option value="">Choose…</option>
            {info.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className={label} htmlFor="tie-note">Note (optional)</label>
        <input id="tie-note" className={field} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. decided by the umpires" />
      </div>

      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      <button type="submit" className={btn.primary} disabled={busy}>{busy ? "Saving…" : "Settle the tie"}</button>
    </form>
  );
}
