import React, { useMemo, useState } from "react";
import { LuCalendarClock, LuCalendarDays, LuChevronDown, LuCrown, LuMail, LuMapPin, LuPhone, LuRepeat, LuSearch, LuTrophy, LuUserCog } from "react-icons/lu";
import { associationApi, shortDate } from "../../api/sparkApi";
import { Alert, Badge, Card, cx, EmptyState, Spinner, Stat, TeamLogo } from "../ui/kit";
import { Meter } from "../ui/charts";
import { field } from "../ui/classes";
import { useLoad } from "../Public/ui";

const STATUS = { pending: ["Being set up", "slate"], open: ["Taking entries", "blue"], setup_done: ["Ready", "blue"], allocated: ["Scheduled", "blue"], live: ["Under way", "red"], completed: ["Finished", "green"], cancelled: ["Cancelled", "slate"], rejected: ["Rejected", "slate"] };

function HostCard({ h, onOpenTeam }) {
  const [open, setOpen] = useState(false);
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 p-5">
        <button type="button" onClick={() => onOpenTeam(h.teamId)} className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-label={`Open ${h.teamName}`}>
          <TeamLogo team={{ id: h.teamId, name: h.teamName, logo: h.logo }} size={52} />
          <span className="min-w-0">
            <span className="block truncate font-display text-xl font-extrabold uppercase tracking-wide text-ink-950 hover:text-spark-700">{h.teamName}</span>
            <span className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1 font-semibold text-ink-700">
                <LuUserCog className="h-3 w-3" aria-hidden="true" />
                {h.admin.name}
              </span>
              {h.admin.phone && (
                <span className="inline-flex items-center gap-1">
                  <LuPhone className="h-3 w-3" aria-hidden="true" />
                  {h.admin.phone}
                </span>
              )}
              {h.admin.email && (
                <span className="inline-flex items-center gap-1">
                  <LuMail className="h-3 w-3" aria-hidden="true" />
                  {h.admin.email}
                </span>
              )}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="tabular font-display text-3xl font-extrabold leading-none text-ink-950">{h.hosted}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-400">Hosted</p>
          </div>
          <div className="text-center">
            <p className="tabular font-display text-3xl font-extrabold leading-none text-ink-950">{h.completed}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-400">Finished</p>
          </div>
          {h.nextReservation && (
            <Badge tone="blue" icon={LuCalendarClock}>
              Next: {shortDate(h.nextReservation.startDate)}
            </Badge>
          )}
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-sm font-bold text-ink-700 transition hover:bg-ink-50">
            {open ? "Hide" : "Tournaments"}
            <LuChevronDown className={cx("h-4 w-4 transition", open && "rotate-180")} aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-ink-50/50">
          {h.tournaments.length ? (
            <ul className="divide-y divide-ink-100">
              {h.tournaments.map((t) => {
                const [name, tone] = STATUS[t.status] || [t.status, "slate"];
                return (
                  <li key={t.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-bold text-ink-950">
                        <span className="truncate">{t.name || "Tournament"}</span>
                        <Badge tone={tone}>{name}</Badge>
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-ink-500">
                        <span className="inline-flex items-center gap-1">
                          <LuCalendarDays className="h-3 w-3" aria-hidden="true" />
                          {shortDate(t.startDate)} to {shortDate(t.endDate)}
                        </span>
                        {t.venue && (
                          <span className="inline-flex items-center gap-1">
                            <LuMapPin className="h-3 w-3" aria-hidden="true" />
                            {t.venue}
                          </span>
                        )}
                        <span>{t.teams} team{t.teams === 1 ? "" : "s"}</span>
                      </p>
                    </div>
                    <Meter label="Matches played" value={t.matchesPlayed} max={t.matches} note={t.matches ? `${t.matchesPlayed} of ${t.matches}` : "No schedule"} />
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {t.champion && (
                        <Badge tone="amber" icon={LuCrown}>
                          {t.champion}
                        </Badge>
                      )}
                      {t.replacements > 0 && (
                        <Badge tone="indigo" icon={LuRepeat}>
                          {t.replacements} replaced
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-ink-500">No tournament created yet{h.nextReservation ? `, dates are reserved from ${shortDate(h.nextReservation.startDate)}` : ""}.</p>
          )}
        </div>
      )}
    </Card>
  );
}

// The teams that host: who runs them, what they hosted, how far each tournament is, who won it and which teams were swapped.
export default function Hosts({ onOpenTeam }) {
  const { data, error, loading } = useLoad(() => associationApi.hosts(), []);
  const [q, setQ] = useState("");

  const shown = useMemo(() => (data || []).filter((h) => !q.trim() || `${h.teamName} ${h.admin.name} ${h.tournaments.map((t) => t.name).join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())), [data, q]);

  if (loading) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  const hosted = data.reduce((n, h) => n + h.hosted, 0);
  const finished = data.reduce((n, h) => n + h.completed, 0);
  const upcoming = data.filter((h) => h.nextReservation).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Hosts" value={data.length} icon={LuUserCog} tone="green" />
        <Stat label="Tournaments hosted" value={hosted} icon={LuCalendarDays} tone="blue" />
        <Stat label="Finished" value={finished} icon={LuTrophy} tone="indigo" />
        <Stat label="With dates reserved" value={upcoming} hint="Hosting soon" icon={LuCalendarClock} tone="amber" />
      </div>

      <div className="relative max-w-md">
        <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <input className={cx(field, "!pl-10")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a host, admin or tournament" aria-label="Search hosts" />
      </div>

      {shown.length ? (
        <div className="space-y-4">
          {shown.map((h) => (
            <HostCard key={h.adminId} h={h} onOpenTeam={onOpenTeam} />
          ))}
        </div>
      ) : (
        <EmptyState icon={LuUserCog} title={data.length ? "No host matches" : "No hosts yet"}>{data.length ? "Try another search." : "A team becomes a host when you reserve dates for it in the season schedule."}</EmptyState>
      )}
    </div>
  );
}
