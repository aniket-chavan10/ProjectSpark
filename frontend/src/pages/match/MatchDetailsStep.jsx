import { LuArrowRight, LuCalendarDays, LuClock3, LuMapPin, LuShirt, LuTimer, LuTriangleAlert } from "react-icons/lu";
import { Alert, Button, cx, PlayerAvatar, TeamLogo } from "../../components/ui/kit";
import { teamColor } from "../../components/Scoring/scoreUtils";
import { dayLabel, clock } from "../../components/AdminDashboard/Schedule/timeUtils";

const stageName = (m) => ({ group: m.group_name ? `Group ${m.group_name}` : "Group stage", semi: "Semi-final", third_place: "Third place", final: "Final" })[m.stage] || "Match";

/** One player of the XI: photo, shirt number, name, captain / keeper marks. */
function LineupCard({ p, index, color }) {
  return (
    <li
      className="group relative animate-fade-up overflow-hidden rounded-2xl bg-white/[0.04] p-3 pt-4 text-center ring-1 ring-inset ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
      style={{ animationDelay: `${index * 35}ms` }}
    >
      <span className="pointer-events-none absolute -right-1 -top-3 font-display text-[64px] font-extrabold italic leading-none text-white/[0.06]" aria-hidden="true">
        {p.jersey_number ?? index + 1}
      </span>
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} aria-hidden="true" />
      <div className="absolute left-2.5 top-2.5 flex gap-1">
        {p.is_captain && <span className="rounded-md bg-amber-400 px-1.5 text-[10px] font-extrabold text-amber-950" title="Captain">C</span>}
        {p.is_keeper && <span className="rounded-md bg-volt-400 px-1.5 text-[10px] font-extrabold text-volt-950" title="Wicket-keeper">WK</span>}
      </div>
      <div className="relative mx-auto w-fit">
        <span className="absolute -inset-1 rounded-full opacity-70 blur-md" style={{ background: color }} aria-hidden="true" />
        <PlayerAvatar name={p.players_name} photo={p.profile_picture} id={p.player_id} size={72} className="relative ring-2 ring-white/80" />
      </div>
      <p className="mt-3 line-clamp-2 min-h-[2.4em] text-[13px] font-bold leading-tight text-white">{p.players_name}</p>
      <p className="mt-0.5 font-display text-sm font-bold tracking-wider text-ink-300">#{p.jersey_number ?? index + 1}</p>
    </li>
  );
}

function Squad({ team, side }) {
  const thin = team.squad.length < 2;
  const captain = team.squad.find((p) => p.is_captain);
  const color = teamColor(team.id);
  return (
    <section aria-label={`${team.team_name} playing XI`} className="relative overflow-hidden rounded-3xl bg-ink-900/70 ring-1 ring-inset ring-white/10 backdrop-blur">
      <header className={cx("relative flex items-center gap-4 overflow-hidden px-6 py-5", side === "right" && "flex-row-reverse text-right")}>
        <div className="absolute inset-0 opacity-90" style={{ background: `linear-gradient(${side === "right" ? "270deg" : "90deg"}, ${color} 0%, ${color}66 45%, transparent 100%)` }} aria-hidden="true" />
        <div className="run-stripes absolute inset-0 opacity-40" aria-hidden="true" />
        <TeamLogo team={team} size={60} className="relative ring-4 ring-white/25" />
        <div className="relative min-w-0 flex-1">
          <h2 className="truncate font-display text-3xl font-extrabold uppercase tracking-wide">{team.team_name}</h2>
          <p className="text-sm text-white/80">{captain ? `Captain · ${captain.players_name}` : "Playing XI"}</p>
        </div>
        <span className={cx("relative rounded-xl px-3 py-1.5 font-display text-lg font-extrabold tracking-wide", thin ? "bg-red-500 text-white" : "bg-ink-950/60 text-white ring-1 ring-white/20")}>
          {team.squad.length} <span className="text-xs font-bold uppercase tracking-widest text-white/70">{team.squad.length === 1 ? "player" : "players"}</span>
        </span>
      </header>

      {thin ? (
        <div className="p-6">
          <Alert tone="warn" title="The playing XI is not set">
            The team admin must choose it (Squad) before the toss, or the toss will not start.
          </Alert>
        </div>
      ) : (
        <ol className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 2xl:grid-cols-4">
          {team.squad.map((p, i) => (
            <LineupCard key={p.player_id} p={p} index={i} color={color} />
          ))}
        </ol>
      )}

      {team.reserves && team.reserves.length > 0 && (
        <div className="border-t border-white/10 px-6 py-4">
          <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-ink-400">Reserves · {team.reserves.length}</p>
          <ul className="flex flex-wrap gap-2">
            {team.reserves.map((p) => (
              <li key={p.player_id} className="flex items-center gap-2 rounded-full bg-white/[0.06] py-1 pl-1 pr-3 ring-1 ring-inset ring-white/10">
                <PlayerAvatar name={p.players_name} photo={p.profile_picture} id={p.player_id} size={24} />
                <span className="text-xs font-semibold text-ink-100">{p.players_name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const Meta = ({ icon: Icon, label, children }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-inset ring-white/10 backdrop-blur">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-spark-grad text-white shadow-glow">
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink-300">{label}</p>
      <p className="truncate text-sm font-bold text-white">{children}</p>
    </div>
  </div>
);

/** The two teams face to face, split down a diagonal in their colours. */
function Matchup({ team1, team2 }) {
  const a = teamColor(team1.id);
  const b = teamColor(team2.id);
  return (
    <div className="relative grid min-h-[260px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-10 sm:px-12">
      <div className="absolute inset-0" style={{ background: `linear-gradient(105deg, ${a} 0%, ${a}cc 38%, transparent 49.8%, transparent 50.2%, ${b}cc 62%, ${b} 100%)`, opacity: 0.9 }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,10,34,.95)_0%,rgba(8,10,34,.4)_40%,transparent_70%)]" aria-hidden="true" />
      <div className="run-stripes absolute inset-0 opacity-30" aria-hidden="true" />

      <div className="relative flex animate-fade-up flex-col items-center gap-4 text-center lg:flex-row lg:justify-end lg:text-right">
        <span className="order-2 font-display text-3xl font-extrabold uppercase leading-none tracking-wide drop-shadow-lg sm:text-5xl 2xl:text-6xl lg:order-1">{team1.team_name}</span>
        <TeamLogo team={team1} size={124} className="order-1 shadow-2xl ring-4 ring-white/30 lg:order-2" />
      </div>
      <div className="relative flex h-20 w-20 animate-pop-in items-center justify-center rounded-full bg-ink-950 font-display text-3xl font-extrabold italic tracking-wider ring-4 ring-white/15 shadow-glow sm:h-24 sm:w-24 sm:text-4xl">
        <span className="text-gradient-spark">VS</span>
      </div>
      <div className="relative flex animate-fade-up flex-col items-center gap-4 text-center lg:flex-row lg:text-left">
        <TeamLogo team={team2} size={124} className="shadow-2xl ring-4 ring-white/30" />
        <span className="font-display text-3xl font-extrabold uppercase leading-none tracking-wide drop-shadow-lg sm:text-5xl 2xl:text-6xl">{team2.team_name}</span>
      </div>
    </div>
  );
}

/** Step 1: the match and both playing XIs, with the players' photos. */
export default function MatchDetailsStep({ details, onNext }) {
  const { match, team1, team2 } = details;
  const ready = team1 && team2;
  const blocked = ready && (team1.squad.length < 2 || team2.squad.length < 2);

  return (
    <div className="space-y-6 pb-24">
      <section className="relative overflow-hidden rounded-3xl bg-ink-950 shadow-pop ring-1 ring-white/10">
        <p className="relative z-10 flex items-center justify-center gap-3 pt-6 text-center text-[11px] font-extrabold uppercase tracking-[0.3em] text-spark-300">
          <span className="h-px w-10 bg-spark-400/60" />
          {match.tournament_name || "Tournament"} · {stageName(match)} · Match {match.match_no}
          <span className="h-px w-10 bg-spark-400/60" />
        </p>
        {ready ? <Matchup team1={team1} team2={team2} /> : <p className="py-16 text-center text-lg text-ink-200">The teams of this match are not decided yet.</p>}
        <div className="relative grid gap-3 border-t border-white/10 bg-ink-950/60 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
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
        <div className="grid gap-6 xl:grid-cols-2">
          <Squad team={team1} side="left" />
          <Squad team={team2} side="right" />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink-950/85 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3.5 sm:px-6 xl:px-10">
          <p className={cx("flex items-center gap-2 text-sm font-semibold", blocked ? "text-amber-300" : "text-ink-300")}>
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
    </div>
  );
}
