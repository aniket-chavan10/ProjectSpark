import { useEffect, useState } from "react";
import { LuCircleCheck, LuPlay, LuRedo2, LuUndo2, LuUsers } from "react-icons/lu";
import { tieBreakApi } from "../../api/sparkApi";
import { Alert, Badge, Button, cx, PlayerAvatar } from "../ui/kit";
import { field, label } from "../ui/classes";

const EXTRAS = [
  { id: "wide", name: "Wide", hint: "+1 run, bowled again" },
  { id: "no-ball", name: "No-ball", hint: "+1 run, bowled again" },
  { id: "bye", name: "Bye", hint: "runs off the keeper" },
  { id: "leg-bye", name: "Leg-bye", hint: "runs off the body" },
];
const RUNS = [0, 1, 2, 3, 4, 5, 6];

const chipTone = (b) => (b.wicket ? "bg-red-600 text-white" : b.extra ? "bg-amber-400 text-amber-950" : b.runs === 6 ? "bg-fuchsia-600 text-white" : b.runs === 4 ? "bg-sky-600 text-white" : b.runs === 0 ? "bg-white/15 text-ink-200" : "bg-white text-ink-950");

/** The balls of an innings as chips; empty slots stay as outlines until the over is done. */
const Balls = ({ inn, slots = 6 }) => (
  <div className="flex flex-wrap items-center gap-2" aria-label="This over">
    {Array.from({ length: Math.max(slots, inn.balls.length) }).map((_, i) => {
      const b = inn.balls[i];
      return (
        <span key={i} className={cx("flex h-10 min-w-[2.5rem] items-center justify-center rounded-full px-2 text-sm font-extrabold tabular", b ? chipTone(b) : "border-2 border-dashed border-white/25 text-transparent")}>
          {b ? b.label : "·"}
        </span>
      );
    })}
  </div>
);

/**
 * Scoring a super over: a run pad like the main scorer's, a strip of the over, and the steps around it
 * (start, next super over when level, confirm the winner). Each tap goes to the server, which tells the stream.
 *   squads   { [teamId]: [{ playerId, name, profilePicture }] } so the batters and bowler can be named (optional)
 */
export default function SuperOverConsole({ matchId, state, onState, onConfirmed, squads = {}, teams = [] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [extra, setExtra] = useState(null);
  const [wicket, setWicket] = useState(false);
  const [players, setPlayers] = useState(false);

  const cur = state && state.current;
  useEffect(() => {
    setExtra(null);
    setWicket(false);
  }, [cur && cur.id, cur && cur.balls.length]);

  const call = async (fn, then) => {
    setBusy(true);
    setError("");
    try {
      const res = await fn();
      if (res && res.superOver !== undefined) onState(res.superOver);
      if (then) then(res);
    } catch (e) {
      setError(e.message);
      // a refused ball usually means another screen scored: show what is really on the board
      tieBreakApi.status(matchId).then((s) => onState(s.superOver)).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- not started ---------------- */
  if (!state) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-5 text-center">
        <p className="text-sm text-ink-700">Each team bats one over (6 balls, 2 wickets). The team that batted second goes first. The stream shows it live.</p>
        {error && <Alert tone="error" className="mt-3" onClose={() => setError("")}>{error}</Alert>}
        <Button className="mt-4" icon={LuPlay} busy={busy} onClick={() => call(() => tieBreakApi.startSuperOver(matchId))}>
          Start the super over
        </Button>
      </div>
    );
  }

  const last = state.rounds[state.rounds.length - 1];
  const [first, second] = last.innings;
  const teamName = (id) => (last.innings.find((i) => i.teamId === id) || {}).teamName;
  const squadOf = (teamId) => squads[teamId] || [];

  const scoreBall = (runs) => call(() => tieBreakApi.superOverBall(matchId, { runs, extra, wicket, lastSeq: cur.balls.length }));
  const bye = extra === "bye" || extra === "leg-bye";

  return (
    <div className="space-y-4">
      {/* what is happening */}
      <div className="rounded-2xl bg-ink-950 p-4 text-white">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Badge tone="amber">{state.round > 1 ? `Super over ${state.round}` : "Super over"}</Badge>
          <span className="text-xs font-semibold text-ink-300">{state.phase === "live" || state.phase === "ready" || state.phase === "break" ? "One over each · 2 wickets" : ""}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[first, second].map((i) => {
            const isCur = cur && cur.id === i.id;
            return (
              <div key={i.id} className={cx("rounded-xl border p-3 transition", isCur ? "border-spark-400 bg-white/10" : "border-white/10 bg-white/5")}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-bold">{i.teamName}</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-ink-300">{i.order === 1 ? "bats first" : "chases"}</span>
                </div>
                <p className="font-display text-4xl font-extrabold leading-tight tabular">
                  {i.runs}
                  <span className="text-spark-400">/</span>
                  {i.wickets} <span className="text-sm font-semibold text-ink-300">0.{i.legalBalls}</span>
                </p>
                {i.balls.length > 0 && <div className="mt-2"><Balls inn={i} /></div>}
              </div>
            );
          })}
        </div>
        {state.chase && cur && <p className="mt-3 text-sm font-bold text-spark-300">{state.chase.need === 0 ? "Target reached" : `${cur.teamName} need ${state.chase.need} off ${state.chase.ballsLeft}`}</p>}
      </div>

      {error && <Alert tone="error" onClose={() => setError("")}>{error}</Alert>}

      {/* level: play another */}
      {state.phase === "level" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-950">Level again at {first.runs}</p>
          <p className="text-sm text-amber-900">Play another super over. {second.teamName} bat first this time.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button icon={LuRedo2} busy={busy} onClick={() => call(() => tieBreakApi.nextSuperOver(matchId))}>
              Start super over {state.round + 1}
            </Button>
            <Button variant="secondary" icon={LuUndo2} disabled={busy} onClick={() => call(() => tieBreakApi.undoSuperOverBall(matchId))}>
              Undo last ball
            </Button>
          </div>
        </div>
      )}

      {/* decided: confirm */}
      {state.phase === "decided" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 font-bold text-emerald-950">
            <LuCircleCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            {state.winnerName} win the super over
          </p>
          <p className="text-sm text-emerald-900">
            {first.teamName} {first.runs}/{first.wickets}, {second.teamName} {second.runs}/{second.wickets}. Confirm to record the result: the winner moves on and points are given. You can still undo the last ball until then.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button busy={busy} icon={LuCircleCheck} onClick={() => call(() => tieBreakApi.confirmSuperOver(matchId), () => onConfirmed && onConfirmed())}>
              Confirm {teamName(state.winnerTeamId)} as winner
            </Button>
            <Button variant="secondary" icon={LuUndo2} disabled={busy} onClick={() => call(() => tieBreakApi.undoSuperOverBall(matchId))}>
              Undo last ball
            </Button>
          </div>
        </div>
      )}

      {/* the run pad */}
      {cur && (
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink-900">
              {cur.teamName} batting <span className="font-medium text-ink-500">· {cur.ballsLeft} ball{cur.ballsLeft === 1 ? "" : "s"} left</span>
            </p>
            <Button size="sm" variant="secondary" icon={LuUsers} onClick={() => setPlayers((p) => !p)} aria-expanded={players}>
              Batters and bowler
            </Button>
          </div>

          {players && (
            <div className="mb-4 grid gap-3 rounded-xl bg-ink-50 p-3 sm:grid-cols-3">
              {[
                ["batter1Id", "Batter 1", cur.teamId, cur.batters[0]],
                ["batter2Id", "Batter 2", cur.teamId, cur.batters[1]],
                ["bowlerId", "Bowler", (teams.find((t) => t.id !== cur.teamId) || {}).id, cur.bowler],
              ].map(([key, text, teamId, chosen]) => (
                <div key={key}>
                  <label className={label} htmlFor={`so-${key}`}>{text}</label>
                  <select
                    id={`so-${key}`}
                    className={field}
                    disabled={busy}
                    value={chosen ? chosen.id : ""}
                    onChange={(e) => {
                      const next = { batter1Id: cur.batters[0] ? cur.batters[0].id : null, batter2Id: cur.batters[1] ? cur.batters[1].id : null, bowlerId: cur.bowler ? cur.bowler.id : null, [key]: e.target.value ? Number(e.target.value) : null };
                      call(() => tieBreakApi.setSuperOverPlayers(matchId, next));
                    }}
                  >
                    <option value="">Not named</option>
                    {squadOf(teamId).map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {cur.batters.length > 0 && (
                <div className="flex items-center gap-2 sm:col-span-3">
                  {cur.batters.map((b) => <PlayerAvatar key={b.id} name={b.name || ""} photo={b.photo} size={28} />)}
                </div>
              )}
            </div>
          )}

          {/* how the ball was bowled */}
          <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Type of ball">
            {EXTRAS.map((x) => (
              <button
                key={x.id}
                type="button"
                title={x.hint}
                aria-pressed={extra === x.id}
                onClick={() => setExtra(extra === x.id ? null : x.id)}
                className={cx("rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 transition", extra === x.id ? "bg-amber-400 text-amber-950 ring-amber-500" : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50")}
              >
                {x.name}
              </button>
            ))}
            <button type="button" aria-pressed={wicket} onClick={() => setWicket(!wicket)} className={cx("rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 transition", wicket ? "bg-red-600 text-white ring-red-700" : "bg-white text-red-700 ring-red-200 hover:bg-red-50")}>
              Wicket
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" role="group" aria-label="Runs">
            {RUNS.map((r) => (
              <button
                key={r}
                type="button"
                disabled={busy || (bye && r === 0)}
                onClick={() => scoreBall(r)}
                className={cx(
                  "h-14 rounded-xl text-xl font-extrabold shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
                  r === 4 ? "bg-sky-600 text-white hover:bg-sky-700" : r === 6 ? "bg-fuchsia-600 text-white hover:bg-fuchsia-700" : "bg-ink-900 text-white hover:bg-ink-800"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {extra || wicket
              ? `Tap the runs to record: ${[extra ? EXTRAS.find((x) => x.id === extra).name : null, wicket ? "wicket" : null].filter(Boolean).join(" + ")}${extra === "wide" || extra === "no-ball" ? " (the extra run is added for you)" : ""}.`
              : "Tap the runs off the ball. Choose Wide, No-ball, Bye, Leg-bye or Wicket first when it applies."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={LuUndo2} disabled={busy || last.innings.every((i) => i.balls.length === 0)} onClick={() => call(() => tieBreakApi.undoSuperOverBall(matchId))}>
              Undo last ball
            </Button>
          </div>
        </div>
      )}

      {state.phase === "break" && <p className="text-center text-sm font-semibold text-ink-600">{first.teamName} are done. {cur.teamName} need {state.chase.target} to win. Tap the runs when the first ball is bowled.</p>}
    </div>
  );
}
