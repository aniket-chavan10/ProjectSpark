import { useState } from "react";
import { btn, card } from "../../components/ui/classes";
import TeamBadge from "../../components/Scoring/TeamBadge";

const Choice = ({ on, onClick, children, disabled }) => (
  <button
    type="button"
    aria-pressed={on}
    disabled={disabled}
    onClick={onClick}
    className={`flex w-full flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
      on ? "border-emerald-600 bg-emerald-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
    } disabled:opacity-50`}
  >
    {children}
  </button>
);

/** Step 2: who won the toss and what did they choose. */
export default function TossStep({ details, onBack, onConfirm, busy, error }) {
  const { team1, team2 } = details;
  const [winnerId, setWinnerId] = useState(null);
  const [decision, setDecision] = useState(null);

  const winner = [team1, team2].find((t) => t.id === winnerId);
  const other = winner ? (winner.id === team1.id ? team2 : team1) : null;
  const batting = winner && decision ? (decision === "bat" ? winner : other) : null;

  return (
    <div className="space-y-6">
      <section className={`${card} p-5 sm:p-6`}>
        <h2 className="text-xl font-bold text-slate-900">Who won the toss?</h2>
        <p className="mt-1 text-sm text-slate-500">Tap the team that called it right.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[team1, team2].map((t) => (
            <Choice key={t.id} on={winnerId === t.id} onClick={() => setWinnerId(t.id)} disabled={busy}>
              <TeamBadge team={t} size={72} />
              <span className="text-lg font-bold text-slate-900">{t.team_name}</span>
              <span className="text-xs text-slate-500">{winnerId === t.id ? "Won the toss ✓" : "Tap if they won the toss"}</span>
            </Choice>
          ))}
        </div>
      </section>

      <section className={`${card} p-5 transition sm:p-6 ${winner ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!winner}>
        <h2 className="text-xl font-bold text-slate-900">{winner ? `${winner.team_name} chose to…` : "What did they choose?"}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Choice on={decision === "bat"} onClick={() => setDecision("bat")} disabled={busy || !winner}>
            <span className="text-4xl" aria-hidden="true">🏏</span>
            <span className="text-lg font-bold text-slate-900">Bat first</span>
          </Choice>
          <Choice on={decision === "bowl"} onClick={() => setDecision("bowl")} disabled={busy || !winner}>
            <span className="text-4xl" aria-hidden="true">⚾</span>
            <span className="text-lg font-bold text-slate-900">Bowl first</span>
          </Choice>
        </div>
      </section>

      {batting && (
        <p className="rounded-xl bg-slate-900 px-5 py-4 text-center text-white">
          <span className="font-bold">{winner.team_name}</span> won the toss and chose to <span className="font-bold">{decision}</span>. <span className="font-bold">{batting.team_name}</span> bat first.
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button type="button" className={btn.secondary} onClick={onBack} disabled={busy}>
          ← Back
        </button>
        <button type="button" className={`${btn.primary} !px-6 !py-3 !text-base`} disabled={!winner || !decision || busy} onClick={() => onConfirm({ tossWinnerId: winner.id, tossDecision: decision })}>
          {busy ? "Starting…" : "Start the match →"}
        </button>
      </div>
    </div>
  );
}
