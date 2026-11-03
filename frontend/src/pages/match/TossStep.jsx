import { useState } from "react";
import { LuArrowLeft, LuCircleCheck, LuPlay } from "react-icons/lu";
import { Alert, Button, cx, TeamLogo } from "../../components/ui/kit";
import { teamCode, teamColor } from "../../components/Scoring/scoreUtils";

// Two cricket drawings (Lucide has none): a bat and a ball.
const BatIcon = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
    <path d="M30.5 5.5 42.5 17.5 19 41c-1.6 1.6-4.2 1.6-5.8 0l-6.2-6.2c-1.6-1.6-1.6-4.2 0-5.8L30.5 5.5Z" fill="currentColor" opacity=".22" />
    <path d="M30.5 5.5 42.5 17.5 19 41c-1.6 1.6-4.2 1.6-5.8 0l-6.2-6.2c-1.6-1.6-1.6-4.2 0-5.8L30.5 5.5Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="m13 35-8 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
const BallIcon = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="17" fill="currentColor" opacity=".22" />
    <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="2.4" />
    <path d="M12 12c6 5 6 19 0 24M36 12c-6 5-6 19 0 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

/** The coin: spins when a winner is picked and lands on their badge. */
function Coin({ winner }) {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center [perspective:800px]">
      <span className="absolute inset-0 rounded-full bg-spark-500/30 blur-2xl" aria-hidden="true" />
      <div key={winner ? winner.id : "none"} className={cx("relative h-32 w-32 [transform-style:preserve-3d]", winner && "animate-coin-flip")}>
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full border-[6px] border-amber-200/70 bg-[radial-gradient(circle_at_35%_30%,#ffe9a8,#f5b82e_45%,#b9770e_100%)] font-display text-4xl font-extrabold text-amber-950 shadow-[inset_0_-6px_12px_rgba(0,0,0,.25),0_20px_40px_-10px_rgba(245,184,46,.6)] [backface-visibility:hidden]"
        >
          {winner ? teamCode(winner.team_name) : "TOSS"}
        </div>
      </div>
    </div>
  );
}

function TeamPick({ team, on, onClick, disabled, side }) {
  const color = teamColor(team.id);
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "group relative flex w-full flex-col items-center gap-4 overflow-hidden rounded-3xl p-8 text-center ring-2 ring-inset transition-all duration-300 focus:outline-none focus-visible:ring-spark-400 disabled:cursor-not-allowed",
        on ? "scale-[1.02] ring-white/70 shadow-pop" : "ring-white/10 hover:ring-white/30"
      )}
    >
      <span className="absolute inset-0 transition-opacity duration-300" style={{ background: `linear-gradient(${side === "left" ? "135deg" : "225deg"}, ${color}, ${color}55 60%, transparent)`, opacity: on ? 1 : 0.35 }} aria-hidden="true" />
      <span className={cx("run-stripes absolute inset-0 transition-opacity", on ? "opacity-40" : "opacity-0")} aria-hidden="true" />
      {on && <LuCircleCheck className="absolute right-5 top-5 h-8 w-8 text-white drop-shadow" aria-hidden="true" />}
      <TeamLogo team={team} size={116} className="relative shadow-2xl ring-4 ring-white/30 transition-transform duration-300 group-hover:scale-105" />
      <span className="relative font-display text-4xl font-extrabold uppercase tracking-wide">{team.team_name}</span>
      <span className={cx("relative rounded-full px-4 py-1 text-xs font-extrabold uppercase tracking-[0.2em]", on ? "bg-white text-ink-950" : "bg-white/10 text-ink-200")}>
        {on ? "Won the toss" : "Tap if they won"}
      </span>
    </button>
  );
}

function DecisionPick({ on, onClick, disabled, icon: Icon, title, hint, tone }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "group relative flex w-full items-center gap-6 overflow-hidden rounded-3xl p-6 text-left ring-2 ring-inset transition-all duration-300 focus:outline-none focus-visible:ring-spark-400 disabled:cursor-not-allowed disabled:opacity-40",
        on ? "ring-white/70 shadow-pop" : "bg-white/[0.04] ring-white/10 hover:bg-white/[0.07] hover:ring-white/25"
      )}
    >
      {on && <span className={cx("absolute inset-0", tone)} aria-hidden="true" />}
      {on && <span className="run-stripes absolute inset-0 opacity-30" aria-hidden="true" />}
      <span className={cx("relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl", on ? "bg-white/20" : "bg-white/[0.06]")}>
        <Icon className="h-12 w-12 text-white" />
      </span>
      <span className="relative">
        <span className="block font-display text-4xl font-extrabold uppercase tracking-wide">{title}</span>
        <span className="block text-sm text-white/75">{hint}</span>
      </span>
      {on && <LuCircleCheck className="absolute right-5 top-5 h-7 w-7 text-white" aria-hidden="true" />}
    </button>
  );
}

const Heading = ({ n, children, sub }) => (
  <div className="mb-5 flex items-center gap-4">
    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-spark-grad font-display text-2xl font-extrabold shadow-glow">{n}</span>
    <div>
      <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide">{children}</h2>
      {sub && <p className="text-sm text-ink-300">{sub}</p>}
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
    <div className="space-y-6 pb-24">
      <section className="rounded-3xl bg-ink-900/60 p-6 ring-1 ring-inset ring-white/10 backdrop-blur sm:p-8">
        <Heading n="1" sub="Tap the team that called it right.">
          Who won the toss?
        </Heading>
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <TeamPick team={team1} side="left" on={winnerId === team1.id} onClick={() => setWinnerId(team1.id)} disabled={busy} />
          <div className="mx-auto">
            <Coin winner={winner} />
          </div>
          <TeamPick team={team2} side="right" on={winnerId === team2.id} onClick={() => setWinnerId(team2.id)} disabled={busy} />
        </div>
      </section>

      <section className={cx("rounded-3xl bg-ink-900/60 p-6 ring-1 ring-inset ring-white/10 backdrop-blur transition sm:p-8", !winner && "opacity-50")} aria-disabled={!winner}>
        <Heading n="2" sub="What did they choose to do?">
          {winner ? `${winner.team_name} chose to…` : "The decision"}
        </Heading>
        <div className="grid gap-5 md:grid-cols-2">
          <DecisionPick on={decision === "bat"} onClick={() => setDecision("bat")} disabled={busy || !winner} icon={BatIcon} title="Bat first" hint="Set a target for the opposition" tone="bg-gradient-to-br from-spark-600 to-amber-500" />
          <DecisionPick on={decision === "bowl"} onClick={() => setDecision("bowl")} disabled={busy || !winner} icon={BallIcon} title="Bowl first" hint="Chase whatever they score" tone="bg-gradient-to-br from-volt-600 to-indigo-600" />
        </div>
      </section>

      {batting && (
        <section className="relative animate-fade-up overflow-hidden rounded-3xl bg-ink-950 shadow-pop ring-1 ring-white/15" aria-live="polite">
          <span className="absolute inset-y-0 left-0 w-2" style={{ background: teamColor(winner.id) }} aria-hidden="true" />
          <div className="run-stripes absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-spark-600/40 to-transparent" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center gap-5 px-8 py-6">
            <TeamLogo team={winner} size={64} className="ring-4 ring-white/20" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-spark-300">Toss</p>
              <p className="font-display text-3xl font-extrabold uppercase tracking-wide">
                {winner.team_name} won the toss and chose to <span className="text-gradient-spark">{decision}</span>
              </p>
              <p className="text-sm text-ink-300">{batting.team_name} bat first.</p>
            </div>
          </div>
        </section>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink-950/85 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3.5 sm:px-6 xl:px-10">
          <Button variant="glass" icon={LuArrowLeft} onClick={onBack} disabled={busy}>
            Back to squads
          </Button>
          <Button size="lg" icon={LuPlay} busy={busy} disabled={!winner || !decision} onClick={() => onConfirm({ tossWinnerId: winner.id, tossDecision: decision })}>
            Start the match
          </Button>
        </div>
      </div>
    </div>
  );
}
