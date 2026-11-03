import { useMemo, useState } from "react";
import { cx, PlayerAvatar } from "../ui/kit";
import { ballText } from "./scoreUtils";

function Scorecard({ card: c }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-display text-xl font-extrabold uppercase tracking-wide text-white">
            {c.teamName} <span className="font-sans text-xs font-semibold normal-case tracking-normal text-ink-400">{c.inningsNumber === 1 ? "1st innings" : "2nd innings"}</span>
          </h3>
          <span className="font-display text-2xl font-extrabold tabular-nums text-white">
            {c.runs}/{c.wickets} <span className="text-sm font-semibold text-ink-400">({c.overs} ov)</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              <tr>
                <th className="py-1.5 pr-2">Batter</th>
                <th className="px-2 text-right">R</th>
                <th className="px-2 text-right">B</th>
                <th className="px-2 text-right">4s</th>
                <th className="px-2 text-right">6s</th>
                <th className="pl-2 text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {c.batting.map((b) => (
                <tr key={b.playerId}>
                  <td className="py-2 pr-2">
                    <div className="font-semibold text-white">
                      {b.name}
                      {b.onStrike && <span className="text-spark-400"> *</span>}
                    </div>
                    <div className="text-xs text-ink-400">{b.howOut}</div>
                  </td>
                  <td className="px-2 text-right font-bold tabular-nums">{b.runs}</td>
                  <td className="px-2 text-right tabular-nums text-ink-300">{b.balls}</td>
                  <td className="px-2 text-right tabular-nums text-ink-300">{b.fours}</td>
                  <td className="px-2 text-right tabular-nums text-ink-300">{b.sixes}</td>
                  <td className="pl-2 text-right tabular-nums text-ink-300">{b.strikeRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-300">
          <span className="font-semibold">Extras {c.extras.total}</span> (wd {c.extras.wides}, nb {c.extras.noBalls}, b {c.extras.byes}, lb {c.extras.legByes})
        </p>
        {c.didNotBat.length > 0 && (
          <p className="mt-1 text-xs text-ink-300">
            <span className="font-semibold">Did not bat:</span> {c.didNotBat.map((p) => p.name).join(", ")}
          </p>
        )}
      </div>

      {c.fallOfWickets.length > 0 && (
        <div>
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Fall of wickets</h4>
          <p className="text-xs leading-relaxed text-ink-200">
            {c.fallOfWickets.map((f) => `${f.score}-${f.wicketNumber} (${f.playerName}, ${f.over} ov)`).join(" · ")}
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            <tr>
              <th className="py-1.5 pr-2">Bowler</th>
              <th className="px-2 text-right">O</th>
              <th className="px-2 text-right">M</th>
              <th className="px-2 text-right">R</th>
              <th className="px-2 text-right">W</th>
              <th className="pl-2 text-right">Econ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {c.bowling.length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-center text-ink-400">
                  Nobody has bowled yet
                </td>
              </tr>
            )}
            {c.bowling.map((b) => (
              <tr key={b.playerId}>
                <td className="py-2 pr-2 font-semibold text-white">{b.name}</td>
                <td className="px-2 text-right tabular-nums">{b.overs}</td>
                <td className="px-2 text-right tabular-nums text-ink-300">{b.maidens}</td>
                <td className="px-2 text-right tabular-nums text-ink-300">{b.runs}</td>
                <td className="px-2 text-right font-bold tabular-nums">{b.wickets}</td>
                <td className="pl-2 text-right tabular-nums text-ink-300">{b.economy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SquadList({ team }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-white">{team.name}</h4>
      <ol className="space-y-1.5">
        {team.players.map((p) => (
          <li key={p.playerId} className="flex items-center gap-2.5 text-sm text-ink-200">
            <PlayerAvatar name={p.name} photo={p.profilePicture} id={p.playerId} size={26} />
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            {p.isCaptain && <span className="rounded bg-amber-400 px-1 text-[10px] font-extrabold text-amber-950">C</span>}
            {p.isKeeper && <span className="rounded bg-volt-400 px-1 text-[10px] font-extrabold text-volt-950">WK</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Scorecard, the latest balls, and the match information (toss, squads). */
export default function ScorecardPanel({ sb, scorecard, inningId }) {
  const [tab, setTab] = useState("card");
  const [picked, setPicked] = useState(null);
  const innings = scorecard?.innings || [];
  const shownId = picked ?? inningId;
  const shown = innings.find((i) => i.inningId === shownId) || innings[0];

  const nameOf = useMemo(() => {
    const all = [...sb.teams.team1.players, ...sb.teams.team2.players];
    const byId = Object.fromEntries(all.map((p) => [p.playerId, p.name]));
    return (id) => byId[id] || (id ? `Player ${id}` : "");
  }, [sb]);

  const inning = sb.innings.find((i) => i.inningId === shownId) || sb.innings[0];
  const tossTeam = sb.tossWinnerId ? (Number(sb.teams.team1.id) === Number(sb.tossWinnerId) ? sb.teams.team1 : sb.teams.team2) : null;

  return (
    <section className="flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-3xl bg-ink-900/70 text-white ring-1 ring-inset ring-white/10 backdrop-blur" aria-label="Scorecard and match information">
      <div className="shrink-0 border-b border-white/10 p-3">
        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl bg-ink-950/60 p-1">
          {[
            { id: "card", label: "Scorecard" },
            { id: "balls", label: "Ball by ball" },
            { id: "info", label: "Match info" },
          ].map((t) => (
            <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cx("rounded-xl px-3 py-2 text-[13px] font-bold transition", tab === t.id ? "bg-spark-grad text-white shadow-glow" : "text-ink-300 hover:text-white")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-y min-h-0 flex-1 p-4">
        {tab === "card" && (
          <>
            {innings.length > 1 && (
              <div className="mb-4 flex gap-2">
                {innings.map((i) => (
                  <button
                    key={i.inningId}
                    type="button"
                    onClick={() => setPicked(i.inningId)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${shown && shown.inningId === i.inningId ? "bg-white text-ink-950" : "bg-white/[0.06] text-ink-300 hover:bg-white/10"}`}
                  >
                    {i.teamName} {i.runs}/{i.wickets}
                  </button>
                ))}
              </div>
            )}
            {shown ? <Scorecard card={shown} /> : <p className="py-6 text-center text-sm text-ink-400">The scorecard appears once the match starts.</p>}
          </>
        )}

        {tab === "balls" && (
          <ol className="space-y-1.5">
            {(inning?.recentBalls || []).filter(Boolean).length === 0 && <li className="py-6 text-center text-sm text-ink-400">No balls yet.</li>}
            {(inning?.recentBalls || []).map((b) => (
              <li key={b.ball_id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 text-sm ring-1 ring-inset ring-white/[0.06]">
                <span className="text-ink-100">{ballText(b, nameOf)}</span>
                <span className="shrink-0 text-xs tabular-nums text-ink-500">
                  Over {b.over_number}.{b.ball_number}
                </span>
              </li>
            ))}
          </ol>
        )}

        {tab === "info" && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-ink-400">Match</dt>
              <dd className="font-medium text-white">
                {sb.teams.team1.name} v {sb.teams.team2.name}
              </dd>
              <dt className="text-ink-400">Overs</dt>
              <dd className="font-medium text-white">{sb.maxOvers} a side</dd>
              <dt className="text-ink-400">Venue</dt>
              <dd className="font-medium text-white">{sb.venue || "—"}</dd>
              <dt className="text-ink-400">Toss</dt>
              <dd className="font-medium text-white">{tossTeam ? `${tossTeam.name} won and chose to ${sb.tossDecision === "bat" ? "bat" : "bowl"}` : "—"}</dd>
            </dl>
            <div className="grid gap-6 sm:grid-cols-2">
              <SquadList team={sb.teams.team1} />
              <SquadList team={sb.teams.team2} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
