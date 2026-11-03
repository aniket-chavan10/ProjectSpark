import { LuUserRoundX } from "react-icons/lu";
import { cx, PlayerAvatar } from "../ui/kit";

const Num = ({ label, value, big }) => (
  <div className="text-center">
    <div className={cx("tabular font-display font-extrabold leading-none", big ? "text-4xl text-white" : "text-xl text-ink-100")}>{value}</div>
    <div className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400">{label}</div>
  </div>
);

function BatterCard({ b }) {
  return (
    <div className={cx("relative overflow-hidden rounded-2xl p-4 ring-1 ring-inset transition", b.isOnStrike ? "bg-gradient-to-r from-spark-500/20 to-transparent ring-spark-400/50" : "bg-white/[0.03] ring-white/10")}>
      {b.isOnStrike && <span className="absolute inset-y-0 left-0 w-1 bg-spark-grad" aria-hidden="true" />}
      <div className="flex items-center gap-3">
        <PlayerAvatar name={b.name} photo={b.profilePicture} id={b.playerId} size={48} className={b.isOnStrike ? "ring-2 ring-spark-400" : "ring-2 ring-white/20"} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-white">{b.name}</p>
          {b.isOnStrike ? (
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-spark-300">● On strike</p>
          ) : (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Non-striker</p>
          )}
        </div>
        <div className="flex items-end gap-1">
          <span className="tabular font-display text-5xl font-extrabold leading-none text-white">{b.runs}</span>
          <span className="tabular mb-1 font-display text-lg font-bold text-ink-400">({b.balls})</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-ink-950/50 py-2">
        <Num label="4s" value={b.fours} />
        <Num label="6s" value={b.sixes} />
        <Num label="SR" value={b.strikeRate} />
      </div>
    </div>
  );
}

/** The two batters and the bowler: what the scorer is watching ball by ball. */
export default function PlayersPanel({ inning, onRetire, awaitingBowler }) {
  const bowler = inning.currentBowler;

  return (
    <section className="space-y-3 rounded-3xl bg-ink-900/70 p-4 ring-1 ring-inset ring-white/10 backdrop-blur" aria-label="Batters and bowler">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-ink-300">At the crease</h2>
        {inning.currentBatsmen.length > 0 && onRetire && (
          <button type="button" onClick={onRetire} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-ink-300 hover:bg-white/10 hover:text-white">
            <LuUserRoundX className="h-4 w-4" aria-hidden="true" />
            Batter retires
          </button>
        )}
      </div>
      {inning.currentBatsmen.length === 0 && <p className="rounded-2xl bg-white/[0.03] px-4 py-6 text-center text-sm text-ink-400">No batter at the crease</p>}
      {inning.currentBatsmen.map((b) => (
        <BatterCard key={b.playerId} b={b} />
      ))}

      <h2 className="px-1 pt-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-ink-300">Bowling</h2>
      {bowler ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-volt-500/15 to-transparent p-4 ring-1 ring-inset ring-volt-400/30">
          <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-volt-400 to-indigo-500" aria-hidden="true" />
          <div className="flex items-center gap-3">
            <PlayerAvatar name={bowler.name} photo={bowler.profilePicture} id={bowler.playerId} size={48} className="ring-2 ring-volt-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-white">{bowler.name}</p>
              <p className="text-xs text-ink-300">Econ {bowler.economy}</p>
            </div>
            <span className="tabular font-display text-4xl font-extrabold leading-none text-white">
              {bowler.wickets}
              <span className="text-ink-400">-{bowler.runsConceded}</span>
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-ink-950/50 py-2">
            <Num label="Overs" value={bowler.overs} />
            <Num label="Maidens" value={bowler.maidens} />
            <Num label="Runs" value={bowler.runsConceded} />
            <Num label="Wkts" value={bowler.wickets} />
          </div>
        </div>
      ) : (
        <p className={cx("rounded-2xl px-4 py-6 text-center text-sm font-semibold", awaitingBowler ? "animate-pulse bg-spark-500/15 text-spark-200 ring-1 ring-inset ring-spark-400/40" : "bg-white/[0.03] text-ink-400")}>{awaitingBowler ? "Choose the next bowler" : "No bowler yet"}</p>
      )}
    </section>
  );
}
