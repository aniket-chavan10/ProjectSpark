import { useMemo, useState } from "react";
import { cx, PlayerAvatar } from "../ui/kit";
import { Section } from "./console";
import { ballText } from "./scoreUtils";

const TH = "py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500";

function Scorecard({ card: c }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-white">
            {c.teamName} <span className="text-xs font-medium text-zinc-500">{c.inningsNumber === 1 ? "1st innings" : "2nd innings"}</span>
          </h3>
          <span className="tabular font-display text-xl font-bold text-white">
            {c.runs}/{c.wickets} <span className="text-xs font-medium text-zinc-500">({c.overs} ov)</span>
          </span>
        </div>
        <table className="w-full text-[13px]">
          <thead className="text-left">
            <tr>
              <th className={TH}>Batter</th>
              <th className={cx(TH, "px-1.5 text-right")}>R</th>
              <th className={cx(TH, "px-1.5 text-right")}>B</th>
              <th className={cx(TH, "px-1.5 text-right")}>4s</th>
              <th className={cx(TH, "px-1.5 text-right")}>6s</th>
              <th className={cx(TH, "pl-1.5 text-right")}>SR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {c.batting.map((b) => (
              <tr key={b.playerId}>
                <td className="py-1.5 pr-2">
                  <div className="font-semibold text-zinc-100">
                    {b.name}
                    {b.onStrike && <span className="text-spark-400"> *</span>}
                  </div>
                  <div className="text-[11px] text-zinc-500">{b.howOut}</div>
                </td>
                <td className="px-1.5 text-right font-bold tabular-nums text-white">{b.runs}</td>
                <td className="px-1.5 text-right tabular-nums text-zinc-400">{b.balls}</td>
                <td className="px-1.5 text-right tabular-nums text-zinc-400">{b.fours}</td>
                <td className="px-1.5 text-right tabular-nums text-zinc-400">{b.sixes}</td>
                <td className="pl-1.5 text-right tabular-nums text-zinc-400">{b.strikeRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">Extras {c.extras.total}</span> (wd {c.extras.wides}, nb {c.extras.noBalls}, b {c.extras.byes}, lb {c.extras.legByes})
        </p>
        {c.didNotBat.length > 0 && (
          <p className="mt-1 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300">Did not bat:</span> {c.didNotBat.map((p) => p.name).join(", ")}
          </p>
        )}
      </div>

      {c.fallOfWickets.length > 0 && (
        <div>
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Fall of wickets</h4>
          <p className="text-xs leading-relaxed text-zinc-300">{c.fallOfWickets.map((f) => `${f.score}-${f.wicketNumber} (${f.playerName}, ${f.over} ov)`).join(" · ")}</p>
        </div>
      )}

      <table className="w-full text-[13px]">
        <thead className="text-left">
          <tr>
            <th className={TH}>Bowler</th>
            <th className={cx(TH, "px-1.5 text-right")}>O</th>
            <th className={cx(TH, "px-1.5 text-right")}>M</th>
            <th className={cx(TH, "px-1.5 text-right")}>R</th>
            <th className={cx(TH, "px-1.5 text-right")}>W</th>
            <th className={cx(TH, "pl-1.5 text-right")}>Econ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {c.bowling.length === 0 && (
            <tr>
              <td colSpan={6} className="py-3 text-center text-zinc-500">
                Nobody has bowled yet
              </td>
            </tr>
          )}
          {c.bowling.map((b) => (
            <tr key={b.playerId}>
              <td className="py-1.5 pr-2 font-semibold text-zinc-100">{b.name}</td>
              <td className="px-1.5 text-right tabular-nums text-zinc-200">{b.overs}</td>
              <td className="px-1.5 text-right tabular-nums text-zinc-400">{b.maidens}</td>
              <td className="px-1.5 text-right tabular-nums text-zinc-400">{b.runs}</td>
              <td className="px-1.5 text-right font-bold tabular-nums text-white">{b.wickets}</td>
              <td className="pl-1.5 text-right tabular-nums text-zinc-400">{b.economy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SquadList({ team }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-white">{team.name}</h4>
      <ol className="space-y-1.5">
        {team.players.map((p) => (
          <li key={p.playerId} className="flex items-center gap-2.5 text-[13px] text-zinc-300">
            <PlayerAvatar name={p.name} photo={p.profilePicture} id={p.playerId} size={24} />
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            {p.isCaptain && <span className="rounded bg-amber-400 px-1 text-[10px] font-extrabold text-amber-950">C</span>}
            {p.isKeeper && <span className="rounded bg-sky-400 px-1 text-[10px] font-extrabold text-sky-950">WK</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The ball by ball log (the first tab: what the scorer checks most), the scorecard, and the match information. */
export default function ScorecardPanel({ sb, scorecard, inningId, className }) {
  const [tab, setTab] = useState("balls");
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

  const tabs = [
    { id: "balls", label: "Ball by ball" },
    { id: "card", label: "Scorecard" },
    { id: "info", label: "Match info" },
  ];

  return (
    <Section
      className={className}
      title="Match"
      aside={
        <div role="tablist" className="flex gap-0.5">
          {tabs.map((t) => (
            <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cx("rounded px-2.5 py-1 text-[12px] font-semibold transition-colors", tab === t.id ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white")}>
              {t.label}
            </button>
          ))}
        </div>
      }
      bodyClass="overflow-y-auto p-3"
    >
      {tab === "card" && (
        <>
          {innings.length > 1 && (
            <div className="mb-3 flex gap-1.5">
              {innings.map((i) => (
                <button key={i.inningId} type="button" onClick={() => setPicked(i.inningId)} className={cx("rounded-md px-2.5 py-1 text-xs font-semibold", shown && shown.inningId === i.inningId ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}>
                  {i.teamName} {i.runs}/{i.wickets}
                </button>
              ))}
            </div>
          )}
          {shown ? <Scorecard card={shown} /> : <p className="py-6 text-center text-sm text-zinc-500">The scorecard appears once the match starts.</p>}
        </>
      )}

      {tab === "balls" && (
        <ol className="divide-y divide-zinc-800">
          {(inning?.recentBalls || []).filter(Boolean).length === 0 && <li className="py-6 text-center text-sm text-zinc-500">No balls yet.</li>}
          {(inning?.recentBalls || []).map((b) => (
            <li key={b.ball_id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
              <span className={cx(Number(b.is_wicket) === 1 ? "font-semibold text-red-300" : "text-zinc-200")}>{ballText(b, nameOf)}</span>
              <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                {b.over_number}.{b.ball_number}
              </span>
            </li>
          ))}
        </ol>
      )}

      {tab === "info" && (
        <div className="space-y-4 text-[13px]">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-zinc-500">Match</dt>
            <dd className="font-medium text-zinc-100">
              {sb.teams.team1.name} v {sb.teams.team2.name}
            </dd>
            <dt className="text-zinc-500">Overs</dt>
            <dd className="font-medium text-zinc-100">{sb.maxOvers} a side</dd>
            <dt className="text-zinc-500">Venue</dt>
            <dd className="font-medium text-zinc-100">{sb.venue || "-"}</dd>
            <dt className="text-zinc-500">Toss</dt>
            <dd className="font-medium text-zinc-100">{tossTeam ? `${tossTeam.name} won and chose to ${sb.tossDecision === "bat" ? "bat" : "bowl"}` : "-"}</dd>
          </dl>
          <div className="grid gap-5 sm:grid-cols-2">
            <SquadList team={sb.teams.team1} />
            <SquadList team={sb.teams.team2} />
          </div>
        </div>
      )}
    </Section>
  );
}
