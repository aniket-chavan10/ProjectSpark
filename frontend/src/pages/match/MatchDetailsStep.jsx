import { LuArrowRight, LuCalendarDays, LuClock3, LuMapPin, LuShirt, LuTimer, LuTriangleAlert } from "react-icons/lu";
import { Alert, Badge, Button, Card, cx, PlayerAvatar, TeamLogo } from "../../components/ui/kit";
import { dayLabel, clock } from "../../components/AdminDashboard/Schedule/timeUtils";

const stageName = (m) => ({ group: m.group_name ? `Group ${m.group_name}` : "Group stage", semi: "Semi-final", third_place: "Third place", final: "Final" })[m.stage] || "Match";

function LineupCard({ p, index }) {
  return (
    <li className="relative flex flex-col items-center rounded-xl border border-slate-200 bg-white px-2 pb-3 pt-4 text-center shadow-sm transition-shadow hover:shadow-raised">
      <span className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-md bg-ink-900 px-1 text-[11px] font-bold text-white tabular">{p.jersey_number ?? index + 1}</span>
      <div className="absolute right-2 top-2 flex flex-col gap-0.5">
        {p.is_captain && <span className="rounded bg-amber-100 px-1 text-[10px] font-extrabold text-amber-800" title="Captain">C</span>}
        {p.is_keeper && <span className="rounded bg-brand-100 px-1 text-[10px] font-extrabold text-brand-800" title="Wicket-keeper">WK</span>}
      </div>
      <PlayerAvatar name={p.players_name} photo={p.profile_picture} id={p.player_id} size={68} ring />
      <p className="mt-2.5 line-clamp-2 min-h-[2.4em] w-full text-[13px] font-semibold leading-tight text-slate-900">{p.players_name}</p>
    </li>
  );
}

function Squad({ team }) {
  const thin = team.squad.length < 2;
  const captain = team.squad.find((p) => p.is_captain);
  return (
    <Card padded={false} aria-label={`${team.team_name} playing XI`} className="overflow-hidden">
      <header className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <TeamLogo team={team} size={48} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-slate-900">{team.team_name}</h2>
          <p className="text-[13px] text-slate-500">{captain ? `Captain ${captain.players_name}` : "Playing XI"}</p>
        </div>
        <Badge tone={thin ? "red" : "green"}>
          {team.squad.length} {team.squad.length === 1 ? "player" : "players"}
        </Badge>
      </header>

      {thin ? (
        <div className="p-5">
          <Alert tone="warn" title="The playing XI is not set">
            The team admin must choose it (Squad) before the toss, or the toss will not start.
          </Alert>
        </div>
      ) : (
        <ol className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {team.squad.map((p, i) => (
            <LineupCard key={p.player_id} p={p} index={i} />
          ))}
        </ol>
      )}

      {team.reserves && team.reserves.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Reserves · {team.reserves.length}</p>
          <ul className="flex flex-wrap gap-2">
            {team.reserves.map((p) => (
              <li key={p.player_id} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 ring-1 ring-slate-200">
                <PlayerAvatar name={p.players_name} photo={p.profile_picture} id={p.player_id} size={24} />
                <span className="text-xs font-medium text-slate-700">{p.players_name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

const Meta = ({ icon: Icon, label, children }) => (
  <div className="flex items-center gap-3">
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-emerald-300">
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">{label}</p>
      <p className="truncate text-sm font-semibold text-white">{children}</p>
    </div>
  </div>
);

/** Step 1: the match and both playing XIs, with the players' photos. */
export default function MatchDetailsStep({ details, onNext }) {
  const { match, team1, team2 } = details;
  const ready = team1 && team2;
  const blocked = ready && (team1.squad.length < 2 || team2.squad.length < 2);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-ink-900 text-white shadow-pop">
        <div className="relative px-6 pb-6 pt-8 sm:px-10">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {match.tournament_name || "Tournament"} · {stageName(match)} · Match {match.match_no}
          </p>
          {ready ? (
            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
              <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-end sm:text-right">
                <span className="order-2 text-xl font-extrabold tracking-tight sm:order-1 sm:text-3xl">{team1.team_name}</span>
                <TeamLogo team={team1} size={96} className="order-1 shadow-xl ring-4 ring-white/15 sm:order-2" />
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold tracking-widest text-ink-200 ring-1 ring-inset ring-white/15">VS</span>
              <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                <TeamLogo team={team2} size={96} className="shadow-xl ring-4 ring-white/15" />
                <span className="text-xl font-extrabold tracking-tight sm:text-3xl">{team2.team_name}</span>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-center text-lg text-ink-200">The teams of this match are not decided yet.</p>
          )}
        </div>
        <div className="relative grid gap-4 border-t border-white/10 bg-black/20 px-6 py-4 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
          <Meta icon={LuCalendarDays} label="When">
            {match.match_date_str ? `${dayLabel(match.match_date_str)}${match.start_time_str ? `, ${clock(match.start_time_str)}` : ""}` : "Not scheduled"}
          </Meta>
          <Meta icon={LuMapPin} label="Where">
            {match.venue || "—"}
          </Meta>
          <Meta icon={LuShirt} label="Format">
            {match.overs || 5} overs a side
          </Meta>
          <Meta icon={LuTimer} label="Slot">
            {match.duration_minutes ? `${match.duration_minutes} minutes` : "—"}
          </Meta>
        </div>
      </section>

      {ready && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Squad team={team1} />
          <Squad team={team2} />
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className={cx("flex items-center gap-2 text-sm", blocked ? "text-amber-800" : "text-slate-500")}>
          {blocked ? (
            <>
              <LuTriangleAlert className="h-4 w-4" aria-hidden="true" /> One team has no playing XI yet.
            </>
          ) : (
            <>
              <LuClock3 className="h-4 w-4" aria-hidden="true" /> Squads lock at the toss.
            </>
          )}
        </p>
        <Button size="lg" iconRight={LuArrowRight} disabled={!ready} onClick={onNext}>
          Continue to the toss
        </Button>
      </div>
    </div>
  );
}
