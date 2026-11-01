import React, { useEffect, useState } from "react";
import { tieBreakApi } from "../../../api/sparkApi";
import { btn, card, field, label } from "../../ui/classes";

const OPTIONS = [
  { id: "super_over", name: "Super over (scorer enters the scores)" },
  { id: "batted_first", name: "Team that batted first wins" },
  { id: "manual", name: "Host decides" },
];

/** The host chooses how a tied match is settled: once for group matches, once for semi-finals and the final. */
export default function TieRulesCard({ tournamentId }) {
  const [rules, setRules] = useState(null);
  const [state, setState] = useState({ busy: false, error: "", saved: false });

  useEffect(() => {
    tieBreakApi.getRules(tournamentId).then(setRules).catch((e) => setState((s) => ({ ...s, error: e.message })));
  }, [tournamentId]);

  const save = async () => {
    setState({ busy: true, error: "", saved: false });
    try {
      await tieBreakApi.setRules(tournamentId, rules);
      setState({ busy: false, error: "", saved: true });
    } catch (e) {
      setState({ busy: false, error: e.message, saved: false });
    }
  };

  if (!rules) return state.error ? <p className="text-sm text-red-700">{state.error}</p> : null;
  const set = (k) => (e) => {
    setRules({ ...rules, [k]: e.target.value });
    setState((s) => ({ ...s, saved: false }));
  };

  return (
    <section className={`${card} p-4`} aria-label="If a match is tied">
      <h3 className="text-sm font-semibold text-slate-900">If a match is tied</h3>
      <p className="mt-0.5 text-xs text-slate-500">Every knock-out match needs a winner. Choose how a tie is settled.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="tie-group">Group matches</label>
          <select id="tie-group" className={field} value={rules.group} onChange={set("group")}>
            {OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="tie-ko">Semi-finals, third place and final</label>
          <select id="tie-ko" className={field} value={rules.knockout} onChange={set("knockout")}>
            {OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className={btn.secondary} disabled={state.busy} onClick={save}>{state.busy ? "Saving…" : "Save"}</button>
        {state.saved && <span className="text-sm font-medium text-emerald-700">Saved</span>}
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
      </div>
    </section>
  );
}
