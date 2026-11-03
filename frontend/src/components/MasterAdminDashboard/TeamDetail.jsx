import React, { useMemo, useState } from "react";
import { LuArrowLeft, LuBan, LuCalendarDays, LuClipboardList, LuCrown, LuMail, LuMedal, LuPhone, LuSearch, LuShirt, LuTrophy, LuUserCog } from "react-icons/lu";
import { associationApi, shortDate } from "../../api/sparkApi";
import { Alert, Badge, Button, Card, cx, EmptyState, PlayerAvatar, Spinner, Tabs, TeamLogo } from "../ui/kit";
import { field } from "../ui/classes";
import { ResultCard, useLoad } from "../Public/ui";

const SQUAD = 11;
const STATUS = { pending: ["Being set up", "slate"], open: ["Taking entries", "blue"], setup_done: ["Ready", "blue"], allocated: ["Scheduled", "blue"], live: ["Under way", "red"], completed: ["Finished", "green"], cancelled: ["Cancelled", "slate"], rejected: ["Rejected", "slate"] };
const PLACE = { 1: ["Champion", "amber", LuCrown], 2: ["Runner-up", "slate", LuMedal], 3: ["Third", "spark", LuMedal] };
const BAN_TONE = { active: "red", upcoming: "amber", expired: "slate", revoked: "green" };

const Mini = ({ label, value }) => (
  <div className="rounded-xl bg-ink-50 px-3 py-2 text-center">
    <p className="tabular font-display text-xl font-extrabold leading-none text-ink-950">{value}</p>
    <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">{label}</p>
  </div>
);

function PlayerCard({ p }) {
  return (
    <li className={cx("rounded-2xl border bg-white p-4 shadow-card", p.banned ? "border-red-200 bg-red-50/40" : "border-ink-100")}>
      <div className="flex items-center gap-3">
        <PlayerAvatar name={p.name || ""} photo={p.photo} id={p.id} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink-950">{p.name || "Unnamed player"}</p>
          {p.mobile && (
            <a href={`tel:${p.mobile}`} className="flex items-center gap-1 truncate text-xs font-medium text-ink-500 hover:text-spark-700">
              <LuPhone className="h-3 w-3 shrink-0" aria-hidden="true" />
              {p.mobile}
            </a>
          )}
          {p.email && (
            <a href={`mailto:${p.email}`} className="flex items-center gap-1 truncate text-xs font-medium text-ink-500 hover:text-spark-700">
              <LuMail className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{p.email}</span>
            </a>
          )}
        </div>
        {p.banned && <Badge tone="red" icon={LuBan}>Banned</Badge>}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <Mini label="Played" value={p.matches} />
        <Mini label="Runs" value={p.runs} />
        <Mini label="Wkts" value={p.wickets} />
        <Mini label="Rating" value={p.rating ?? "—"} />
      </div>
      {p.banned && p.bannedUntil && <p className="mt-2 text-xs font-semibold text-red-700">Banned until {shortDate(p.bannedUntil)}</p>}
    </li>
  );
}

// One team in full: who runs it, how it stands, and every player on its squad.
export default function TeamDetail({ id, onBack, goTo }) {
  const { data: t, error, loading } = useLoad(() => associationApi.team(id), [id]);
  const [tab, setTab] = useState("players");
  const [q, setQ] = useState("");

  const roster = useMemo(() => (t ? t.roster.filter((p) => !q.trim() || `${p.name} ${p.mobile} ${p.email}`.toLowerCase().includes(q.trim().toLowerCase())) : []), [t, q]);

  const back = (
    <Button variant="secondary" size="sm" icon={LuArrowLeft} onClick={onBack}>
      All teams
    </Button>
  );
  if (loading) return <div className="space-y-4">{back}<Spinner /></div>;
  if (error) return <div className="space-y-4">{back}<Alert tone="error">{error}</Alert></div>;

  const bannedPlayers = t.roster.filter((p) => p.banned).length;

  return (
    <div className="space-y-6">
      {back}

      <Card padded={false} className="overflow-hidden">
        <div className="h-2 bg-spark-grad" aria-hidden="true" />
        <div className="flex flex-col gap-6 p-6 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-5">
            <TeamLogo team={{ id: t.id, name: t.name, logo: t.logo }} size={84} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-4xl font-extrabold uppercase tracking-wide text-ink-950">{t.name}</h2>
                {t.banned ? <Badge tone="red" icon={LuBan}>Banned</Badge> : <Badge tone="green">Active</Badge>}
                {t.roster.length < SQUAD && <Badge tone="amber" icon={LuShirt}>Short squad</Badge>}
              </div>
              <p className="mt-1 text-sm font-semibold text-ink-500">
                {t.village || "Village not set"} · with the association since {shortDate(t.since)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-700">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <LuUserCog className="h-4 w-4 text-ink-400" aria-hidden="true" />
                  {t.admin.name || "No admin"}
                </span>
                {t.admin.phone && (
                  <a href={`tel:${t.admin.phone}`} className="inline-flex items-center gap-1.5 hover:text-spark-700">
                    <LuPhone className="h-4 w-4 text-ink-400" aria-hidden="true" />
                    {t.admin.phone}
                  </a>
                )}
                {t.admin.email && (
                  <a href={`mailto:${t.admin.email}`} className="inline-flex items-center gap-1.5 hover:text-spark-700">
                    <LuMail className="h-4 w-4 text-ink-400" aria-hidden="true" />
                    {t.admin.email}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 xl:min-w-[30rem]">
            <Mini label="Rank" value={t.standing.rank ? `#${t.standing.rank}` : "—"} />
            <Mini label="Points" value={t.standing.points} />
            <Mini label="Won" value={`${t.standing.won}/${t.standing.played}`} />
            <Mini label="Titles" value={t.standing.titles} />
            <Mini label="Hosted" value={t.hosted} />
          </div>
        </div>
        {t.banned && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-900">
            <span>
              <strong>This team is banned.</strong> {(t.bans.find((b) => b.status === "active") || {}).reason}
            </span>
            <Button size="sm" variant="secondary" onClick={() => goTo("bans")}>
              Manage bans
            </Button>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "players", label: "Players", icon: LuShirt, count: t.roster.length },
            { id: "tournaments", label: "Tournaments", icon: LuCalendarDays, count: t.tournaments.length },
            { id: "results", label: "Results", icon: LuTrophy, count: t.recentResults.length },
            { id: "bans", label: "Bans", icon: LuBan, count: t.bans.length },
          ]}
        />
        {tab === "players" && t.roster.length > 0 && (
          <div className="relative w-full lg:max-w-xs">
            <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input className={cx(field, "!pl-10")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a player" aria-label="Find a player" />
          </div>
        )}
      </div>

      {tab === "players" &&
        (t.roster.length ? (
          <>
            <p className="text-sm text-ink-500">
              {t.roster.length} player{t.roster.length === 1 ? "" : "s"}
              {bannedPlayers ? ` · ${bannedPlayers} banned` : ""}
              {t.roster.length < SQUAD ? ` · needs ${SQUAD - t.roster.length} more for a full squad` : ""}
            </p>
            {roster.length ? (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {roster.map((p) => (
                  <PlayerCard key={p.id} p={p} />
                ))}
              </ul>
            ) : (
              <EmptyState icon={LuSearch} title="No player matches">Try another name.</EmptyState>
            )}
          </>
        ) : (
          <EmptyState icon={LuShirt} title="No players yet">The team admin has not added any players.</EmptyState>
        ))}

      {tab === "tournaments" &&
        (t.tournaments.length ? (
          <Card padded={false}>
            <ul className="divide-y divide-ink-100">
              {t.tournaments.map((x) => {
                const [name, tone] = STATUS[x.status] || [x.status, "slate"];
                const place = PLACE[x.position];
                return (
                  <li key={x.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink-950">{x.name || "Tournament"}</p>
                      <p className="text-xs text-ink-500">
                        {shortDate(x.startDate)}
                        {x.group ? ` · Group ${x.group}` : ""}
                      </p>
                    </div>
                    {place && <Badge tone={place[1]} icon={place[2]}>{place[0]}</Badge>}
                    {x.entry === "cancelled" && <Badge tone="slate">Withdrew</Badge>}
                    <Badge tone={tone}>{name}</Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : (
          <EmptyState icon={LuCalendarDays} title="No tournaments yet">This team has not entered a tournament.</EmptyState>
        ))}

      {tab === "results" &&
        (t.recentResults.length ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {t.recentResults.map((m) => (
              <ResultCard key={m.matchId} m={m} />
            ))}
          </div>
        ) : (
          <EmptyState icon={LuTrophy} title="No finished matches">Results appear after a match is completed.</EmptyState>
        ))}

      {tab === "bans" &&
        (t.bans.length ? (
          <Card padded={false}>
            <ul className="divide-y divide-ink-100">
              {t.bans.map((b) => (
                <li key={b.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={BAN_TONE[b.status]}>{b.status}</Badge>
                    <span className="text-sm font-semibold text-ink-900">{b.reason}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {shortDate(b.startsOn)} to {b.endsOn ? shortDate(b.endsOn) : "until lifted"}
                    {b.revokedAt ? ` · lifted ${shortDate(b.revokedAt)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState icon={LuClipboardList} title="Never banned">This team has a clean record.</EmptyState>
        ))}
    </div>
  );
}
