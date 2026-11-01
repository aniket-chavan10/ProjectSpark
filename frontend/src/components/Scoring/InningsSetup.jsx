import { useState } from "react";
import { LuPlay } from "react-icons/lu";
import { field, label } from "../ui/classes";
import { Alert, Button, Card, PlayerAvatar } from "../ui/kit";

/** Before the first ball of an innings: the two openers and the first bowler. */
export default function InningsSetup({ inningsNumber, battingTeam, bowlingTeam, banner, onSubmit, busy }) {
  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");

  const same = strikerId && strikerId === nonStrikerId;
  const ready = strikerId && nonStrikerId && bowlerId && !same;
  const thin = battingTeam.players.length < 2 || bowlingTeam.players.length < 1;
  const find = (team, id) => team.players.find((p) => String(p.playerId) === String(id));

  const Pick = ({ id, title, value, onChange, team, skip }) => {
    const chosen = find(team, value);
    return (
      <div>
        <label className={label} htmlFor={id}>
          {title}
        </label>
        <div className="flex items-center gap-3">
          <PlayerAvatar name={chosen ? chosen.name : "?"} photo={chosen && chosen.profilePicture} id={chosen && chosen.playerId} size={44} />
          <select id={id} className={field} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Choose…</option>
            {team.players.map((p) => (
              <option key={p.playerId} value={p.playerId} disabled={skip && String(p.playerId) === skip}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <Card className="!p-6" aria-labelledby="setup-title">
      {banner && <div className="mb-5 rounded-xl bg-ink-900 px-4 py-3 text-sm text-white">{banner}</div>}
      <h2 id="setup-title" className="text-xl font-bold tracking-tight text-slate-900">
        {inningsNumber === 1 ? "Start the match" : "Start the second innings"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {battingTeam.name} bat. Choose the two openers and who bowls the first over.
      </p>

      {thin ? (
        <Alert tone="warn" className="mt-4">
          A playing XI has not been set for one of the teams, so there is nobody to choose. Set the playing XI first.
        </Alert>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Pick id="open-striker" title="Opener on strike" value={strikerId} onChange={setStrikerId} team={battingTeam} />
          <Pick id="open-non" title="Opener at the other end" value={nonStrikerId} onChange={setNonStrikerId} team={battingTeam} skip={strikerId} />
          <Pick id="open-bowler" title={`Opening bowler (${bowlingTeam.name})`} value={bowlerId} onChange={setBowlerId} team={bowlingTeam} />
        </div>
      )}
      {same && <p className="mt-3 text-sm text-red-600">The two openers must be different players.</p>}

      <div className="mt-7">
        <Button size="lg" icon={LuPlay} busy={busy} disabled={!ready || thin} onClick={() => onSubmit({ strikerId: Number(strikerId), nonStrikerId: Number(nonStrikerId), bowlerId: Number(bowlerId) })}>
          Start scoring
        </Button>
      </div>
    </Card>
  );
}
