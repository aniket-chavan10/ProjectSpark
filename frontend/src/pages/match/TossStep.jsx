import { useState } from "react";
import { LuArrowLeft, LuCircleCheck, LuPlay } from "react-icons/lu";
import { Alert, Button, Card, cx, TeamLogo } from "../../components/ui/kit";

// Two little cricket drawings (Lucide has none): a bat and a ball.
const BatIcon = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
    <path d="M30.5 5.5 42.5 17.5 19 41c-1.6 1.6-4.2 1.6-5.8 0l-6.2-6.2c-1.6-1.6-1.6-4.2 0-5.8L30.5 5.5Z" fill="currentColor" opacity=".18" />
    <path d="M30.5 5.5 42.5 17.5 19 41c-1.6 1.6-4.2 1.6-5.8 0l-6.2-6.2c-1.6-1.6-1.6-4.2 0-5.8L30.5 5.5Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="m13 35-8 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
const BallIcon = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="17" fill="currentColor" opacity=".18" />
    <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="2.4" />
    <path d="M12 12c6 5 6 19 0 24M36 12c-6 5-6 19 0 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const Choice = ({ on, onClick, children, disabled, className }) => (
  <button
    type="button"
    aria-pressed={on}
    disabled={disabled}
    onClick={onClick}
    className={cx(
      "relative flex w-full flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      on ? "border-emerald-600 bg-emerald-50 shadow-raised" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-card",
      className
    )}
  >
    {on && <LuCircleCheck className="absolute right-3 top-3 h-6 w-6 text-emerald-600" aria-hidden="true" />}
    {children}
  </button>
);

const Heading = ({ n, children, sub }) => (
  <div className="mb-5 flex items-center gap-3">
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white">{n}</span>
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{children}</h2>
      {sub && <p className="text-[13px] text-slate-500">{sub}</p>}
    </div>
  </div>
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
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="!p-6">
        <Heading n="1" sub="Tap the team that called it right.">
          Who won the toss?
        </Heading>
        <div className="grid gap-4 sm:grid-cols-2">
          {[team1, team2].map((t) => (
            <Choice key={t.id} on={winnerId === t.id} onClick={() => setWinnerId(t.id)} disabled={busy}>
              <TeamLogo team={t} size={88} className="shadow-lg ring-4 ring-white" />
              <span className="text-lg font-bold text-slate-900">{t.team_name}</span>
              <span className={cx("text-xs font-semibold", winnerId === t.id ? "text-emerald-700" : "text-slate-400")}>{winnerId === t.id ? "Won the toss" : "Tap if they won the toss"}</span>
            </Choice>
          ))}
        </div>
      </Card>

      <Card className={cx("!p-6 transition", winner ? "" : "pointer-events-none opacity-50")} aria-disabled={!winner}>
        <Heading n="2" sub="What did they choose to do?">
          {winner ? `${winner.team_name} chose to…` : "The decision"}
        </Heading>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice on={decision === "bat"} onClick={() => setDecision("bat")} disabled={busy || !winner}>
            <BatIcon className="h-14 w-14 text-emerald-700" />
            <span className="text-lg font-bold text-slate-900">Bat first</span>
          </Choice>
          <Choice on={decision === "bowl"} onClick={() => setDecision("bowl")} disabled={busy || !winner}>
            <BallIcon className="h-14 w-14 text-slate-600" />
            <span className="text-lg font-bold text-slate-900">Bowl first</span>
          </Choice>
        </div>
      </Card>

      {batting && (
        <section className="flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-ink-900 px-6 py-5 text-white shadow-pop" aria-live="polite">
          <TeamLogo team={winner} size={44} className="ring-2 ring-white/20" />
          <p className="text-center text-[15px]">
            <span className="font-bold">{winner.team_name}</span> won the toss and chose to <span className="font-bold text-emerald-300">{decision}</span>.{" "}
            <span className="font-bold">{batting.team_name}</span> bat first.
          </p>
        </section>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex items-center justify-between">
        <Button variant="secondary" icon={LuArrowLeft} onClick={onBack} disabled={busy}>
          Back to squads
        </Button>
        <Button size="lg" icon={LuPlay} busy={busy} disabled={!winner || !decision} onClick={() => onConfirm({ tossWinnerId: winner.id, tossDecision: decision })}>
          Start the match
        </Button>
      </div>
    </div>
  );
}
