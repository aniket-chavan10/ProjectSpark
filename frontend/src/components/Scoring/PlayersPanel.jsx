import { cx, PlayerAvatar } from "../ui/kit";
import { Section } from "./console";

const Fig = ({ k, v }) => (
  <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
    {k} <b className="tabular text-[13px] font-semibold text-zinc-200">{v}</b>
  </span>
);

function BatterRow({ b }) {
  return (
    <div className={cx("relative flex items-center gap-3 rounded-md border px-3 py-2.5", b.isOnStrike ? "border-spark-500/60 bg-spark-500/10" : "border-zinc-800 bg-zinc-950/40")}>
      <PlayerAvatar name={b.name} photo={b.profilePicture} id={b.playerId} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-white">{b.name}</p>
        <p className={cx("text-[10px] font-bold uppercase tracking-[0.16em]", b.isOnStrike ? "text-spark-300" : "text-zinc-500")}>{b.isOnStrike ? "● On strike" : "Non-striker"}</p>
        <div className="mt-1 flex gap-3">
          <Fig k="4s" v={b.fours} />
          <Fig k="6s" v={b.sixes} />
          <Fig k="SR" v={b.strikeRate} />
        </div>
      </div>
      <div className="text-right">
        <span className="tabular font-display text-[38px] font-bold leading-none text-white">{b.runs}</span>
        <span className="tabular ml-1 font-display text-base font-semibold text-zinc-500">({b.balls})</span>
      </div>
    </div>
  );
}

/** The two batters and the bowler: what the scorer is watching ball by ball. */
export default function PlayersPanel({ inning, awaitingBowler, className }) {
  const bowler = inning.currentBowler;
  const last = inning.lastWicket;
  return (
    <Section title="At the crease" className={className} bodyClass="space-y-2 overflow-y-auto p-3">
      {inning.currentBatsmen.length === 0 && <p className="rounded-md border border-dashed border-zinc-700 px-4 py-5 text-center text-sm text-zinc-500">No batter at the crease</p>}
      {inning.currentBatsmen.map((b) => (
        <BatterRow key={b.playerId} b={b} />
      ))}

      <h2 className="px-0.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Bowling</h2>
      {bowler ? (
        <div className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
          <PlayerAvatar name={bowler.name} photo={bowler.profilePicture} id={bowler.playerId} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-white">{bowler.name}</p>
            <div className="mt-1 flex gap-3">
              <Fig k="Ov" v={bowler.overs} />
              <Fig k="M" v={bowler.maidens} />
              <Fig k="Econ" v={bowler.economy} />
            </div>
          </div>
          <span className="tabular font-display text-[38px] font-bold leading-none text-white">
            {bowler.wickets}
            <span className="text-zinc-500">-{bowler.runsConceded}</span>
          </span>
        </div>
      ) : (
        <p className={cx("rounded-md px-4 py-5 text-center text-sm font-semibold", awaitingBowler ? "bg-spark-500/10 text-spark-300 ring-1 ring-inset ring-spark-500/40" : "border border-dashed border-zinc-700 text-zinc-500")}>{awaitingBowler ? "Choose the next bowler" : "No bowler yet"}</p>
      )}

      <dl className="grid grid-cols-2 gap-2 pt-2 text-[12px]">
        <div className="rounded-md bg-zinc-950/40 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Partnership</dt>
          <dd className="tabular mt-0.5 text-sm font-semibold text-zinc-100">{inning.partnershipRuns} runs</dd>
        </div>
        <div className="min-w-0 rounded-md bg-zinc-950/40 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Last wicket</dt>
          <dd className="mt-0.5 truncate text-sm font-semibold text-zinc-100">{last ? `${last.playerOutName || "-"}${last.over ? ` · ${last.over}` : ""}` : "-"}</dd>
        </div>
      </dl>
    </Section>
  );
}
