import { useState } from "react";
import { LuCheck, LuPlay } from "react-icons/lu";
import { cx, PlayerAvatar, TeamLogo } from "../ui/kit";
import { Section, CButton } from "./console";
import { teamColor } from "./scoreUtils";

/** One column of the line-up: tap a player to put them in this slot. */
function SlotColumn({ step, title, team, value, onChange, skip, accent }) {
  const chosen = team.players.find((p) => String(p.playerId) === String(value));
  return (
    <Section className="min-w-0" bodyClass="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 px-3 py-2.5" style={{ boxShadow: `inset 4px 0 0 ${accent}` }}>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-sm font-bold text-zinc-200">{step}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="truncate text-xs text-zinc-400">{chosen ? chosen.name : `Choose from ${team.name}`}</p>
        </div>
        {chosen && <PlayerAvatar name={chosen.name} photo={chosen.profilePicture} id={chosen.playerId} size={32} />}
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
        {team.players.map((p) => {
          const on = String(p.playerId) === String(value);
          const off = skip && skip.includes(String(p.playerId));
          return (
            <li key={p.playerId}>
              <button type="button" disabled={off} onClick={() => onChange(String(p.playerId))} className={cx("flex h-9 w-full items-center gap-3 rounded-md border px-2.5 text-left transition-colors", on ? "border-spark-500 bg-spark-600/20 text-white" : "border-transparent text-zinc-200 hover:bg-zinc-800", off && "cursor-not-allowed opacity-30")}>
                <PlayerAvatar name={p.name} photo={p.profilePicture} id={p.playerId} size={26} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{p.name}</span>
                {p.jerseyNumber && <span className="font-display text-sm font-bold text-zinc-500">#{p.jerseyNumber}</span>}
                {on && <LuCheck className="h-4 w-4 text-spark-400" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
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
    <section className="flex h-full min-h-0 flex-col gap-3" aria-labelledby="setup-title">
      {banner && <p className="shrink-0 rounded-md border border-spark-500/40 bg-spark-500/10 px-4 py-2.5 text-[13px] font-semibold text-spark-200">{banner}</p>}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TeamLogo team={battingTeam} size={44} />
          <div>
            <h2 id="setup-title" className="text-lg font-semibold text-white">
              {inningsNumber === 1 ? "Start the match" : "Start the chase"}
            </h2>
            <p className="text-[13px] text-zinc-400">{battingTeam.name} bat. Pick the two openers and who bowls the first over.</p>
          </div>
        </div>
        <CButton variant="primary" size="lg" icon={LuPlay} disabled={!ready || thin || busy} onClick={() => onSubmit({ strikerId: Number(strikerId), nonStrikerId: Number(nonStrikerId), bowlerId: Number(bowlerId) })}>
          {busy ? "Starting…" : "Start scoring"}
        </CButton>
      </div>

      {thin ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">A playing XI has not been set for one of the teams, so there is nobody to choose. Set the playing XI first.</p>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3">
          <SlotColumn step="1" title="On strike" team={battingTeam} value={strikerId} onChange={setStrikerId} skip={[nonStrikerId]} accent={bat} />
          <SlotColumn step="2" title="Non-striker" team={battingTeam} value={nonStrikerId} onChange={setNonStrikerId} skip={[strikerId]} accent={bat} />
          <SlotColumn step="3" title="Opening bowler" team={bowlingTeam} value={bowlerId} onChange={setBowlerId} accent={bowl} />
        </div>
      )}
      {same && <p className="shrink-0 text-sm text-red-400">The two openers must be different players.</p>}
    </section>
  );
}
