import { useState } from "react";
import { LuCheck, LuPlay } from "react-icons/lu";
import { Alert, Button, cx, PlayerAvatar, TeamLogo } from "../ui/kit";
import { teamColor } from "./scoreUtils";

/** One column of the line-up: tap a player to put them in this slot. */
function SlotColumn({ step, title, team, value, onChange, skip, accent }) {
  const chosen = team.players.find((p) => String(p.playerId) === String(value));
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-3xl bg-ink-900/70 ring-1 ring-inset ring-white/10">
      <div className="relative overflow-hidden px-5 py-4" style={{ background: `linear-gradient(120deg, ${accent}cc, ${accent}33 70%, transparent)` }}>
        <div className="run-stripes absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-950/60 font-display text-xl font-extrabold">{step}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-extrabold uppercase tracking-wide">{title}</p>
            <p className="truncate text-xs font-semibold text-white/80">{chosen ? chosen.name : `Choose from ${team.name}`}</p>
          </div>
          {chosen && <PlayerAvatar name={chosen.name} photo={chosen.profilePicture} id={chosen.playerId} size={44} className="ring-2 ring-white" />}
        </div>
      </div>
      <ul className="scroll-y max-h-[420px] space-y-1.5 p-3">
        {team.players.map((p) => {
          const on = String(p.playerId) === String(value);
          const off = skip && skip.includes(String(p.playerId));
          return (
            <li key={p.playerId}>
              <button
                type="button"
                disabled={off}
                onClick={() => onChange(String(p.playerId))}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition",
                  on ? "bg-white text-ink-950 shadow-pop" : "text-ink-100 hover:bg-white/[0.07]",
                  off && "cursor-not-allowed opacity-30"
                )}
              >
                <PlayerAvatar name={p.name} photo={p.profilePicture} id={p.playerId} size={34} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.name}</span>
                {p.jerseyNumber && <span className={cx("font-display text-sm font-bold", on ? "text-ink-500" : "text-ink-400")}>#{p.jerseyNumber}</span>}
                {on && <LuCheck className="h-4 w-4 text-spark-600" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Before the first ball of an innings: the two openers and the first bowler. */
export default function InningsSetup({ inningsNumber, battingTeam, bowlingTeam, banner, onSubmit, busy }) {
  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");

  const same = strikerId && strikerId === nonStrikerId;
  const ready = strikerId && nonStrikerId && bowlerId && !same;
  const thin = battingTeam.players.length < 2 || bowlingTeam.players.length < 1;
  const bat = teamColor(battingTeam.id);
  const bowl = teamColor(bowlingTeam.id);

  return (
    <section className="space-y-5" aria-labelledby="setup-title">
      {banner && (
        <div className="run-stripes relative overflow-hidden rounded-2xl bg-gradient-to-r from-spark-600 to-amber-500 px-5 py-4 font-semibold text-white shadow-glow">{banner}</div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <TeamLogo team={battingTeam} size={56} className="ring-4 ring-white/20" />
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-spark-300">{inningsNumber === 1 ? "First innings" : "Second innings"}</p>
            <h2 id="setup-title" className="font-display text-4xl font-extrabold uppercase tracking-wide text-white">
              {inningsNumber === 1 ? "Start the match" : "Start the chase"}
            </h2>
            <p className="text-sm text-ink-300">{battingTeam.name} bat. Pick the two openers and who bowls the first over.</p>
          </div>
        </div>
        <Button size="lg" icon={LuPlay} busy={busy} disabled={!ready || thin} onClick={() => onSubmit({ strikerId: Number(strikerId), nonStrikerId: Number(nonStrikerId), bowlerId: Number(bowlerId) })}>
          Start scoring
        </Button>
      </div>

      {thin ? (
        <Alert tone="warn">A playing XI has not been set for one of the teams, so there is nobody to choose. Set the playing XI first.</Alert>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <SlotColumn step="1" title="On strike" team={battingTeam} value={strikerId} onChange={setStrikerId} skip={[nonStrikerId]} accent={bat} />
          <SlotColumn step="2" title="Non-striker" team={battingTeam} value={nonStrikerId} onChange={setNonStrikerId} skip={[strikerId]} accent={bat} />
          <SlotColumn step="3" title="Opening bowler" team={bowlingTeam} value={bowlerId} onChange={setBowlerId} accent={bowl} />
        </div>
      )}
      {same && <p className="text-sm text-red-400">The two openers must be different players.</p>}
    </section>
  );
}
