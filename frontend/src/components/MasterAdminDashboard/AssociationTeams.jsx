import React, { useMemo, useState } from "react";
import { LuBan, LuInbox, LuMail, LuPhone, LuSearch, LuShirt, LuTrophy, LuUsersRound } from "react-icons/lu";
import { associationApi } from "../../api/sparkApi";
import { Alert, Badge, Button, cx, EmptyState, Spinner, Stat, Tabs, TeamLogo } from "../ui/kit";
import { field } from "../ui/classes";
import { useDebounced, useLoad } from "../Public/ui";
import TeamDetail from "./TeamDetail";

const SQUAD = 11;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "banned", label: "Banned" },
  { id: "short", label: "Short squad" },
];

const Figure = ({ label, value }) => (
  <div className="min-w-0">
    <p className="tabular font-display text-2xl font-extrabold leading-none text-ink-950">{value}</p>
    <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-400">{label}</p>
  </div>
);

function TeamCard({ t, onOpen }) {
  const short = t.players < SQUAD;
  return (
    <button type="button" onClick={onOpen} className={cx("group flex h-full flex-col rounded-2xl border bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-raised", t.banned ? "border-red-200" : "border-ink-100")}>
      <div className="flex items-start gap-3">
        <TeamLogo team={{ id: t.id, name: t.name, logo: t.logo }} size={52} />
        <div className="min-w-0 flex-1">
          <p className="break-words font-display text-xl font-extrabold uppercase leading-tight tracking-wide text-ink-950 group-hover:text-spark-700">{t.name}</p>
          <p className="truncate text-xs font-semibold text-ink-500">{t.village || "Village not set"}</p>
        </div>
        {t.banned ? <Badge tone="red" icon={LuBan}>Banned</Badge> : t.rank === 1 ? <Badge tone="amber" icon={LuTrophy}>No. 1</Badge> : null}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3 border-y border-ink-100 py-3">
        <Figure label="Players" value={t.players} />
        <Figure label="Rank" value={t.rank ? `#${t.rank}` : "—"} />
        <Figure label="Points" value={t.points} />
        <Figure label="Won" value={`${t.won}/${t.played}`} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {short && <Badge tone="amber" icon={LuShirt}>{t.players === 0 ? "No players" : `${SQUAD - t.players} short of a squad`}</Badge>}
        {!t.logo && <Badge tone="slate">No logo</Badge>}
        {t.titles > 0 && <Badge tone="spark" icon={LuTrophy}>{t.titles} title{t.titles === 1 ? "" : "s"}</Badge>}
      </div>

      <div className="mt-auto pt-3 text-xs text-ink-500">
        <p className="truncate font-semibold text-ink-700">{t.admin.name || "No admin"}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {t.admin.phone && (
            <span className="inline-flex items-center gap-1">
              <LuPhone className="h-3 w-3" aria-hidden="true" />
              {t.admin.phone}
            </span>
          )}
          {t.admin.email && (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <LuMail className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{t.admin.email}</span>
            </span>
          )}
        </p>
      </div>
    </button>
  );
}

// Every team of the association: who runs it, its squad, where it stands, whether it is banned. Open one to see its players.
const AssociationTeams = ({ goTo, focusTeamId, onFocusChange }) => {
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(focusTeamId || null);
  const { data, error, loading } = useLoad(() => associationApi.teams(search), [search]);

  const open = (id) => {
    setOpenId(id);
    if (onFocusChange) onFocusChange(id);
  };

  const counts = useMemo(() => {
    const items = data ? data.items : [];
    return { all: items.length, active: items.filter((t) => !t.banned).length, banned: items.filter((t) => t.banned).length, short: items.filter((t) => t.players < SQUAD).length, noLogo: items.filter((t) => !t.logo).length };
  }, [data]);

  if (openId) return <TeamDetail id={openId} goTo={goTo} onBack={() => open(null)} />;

  const shown = (data ? data.items : []).filter((t) => (filter === "banned" ? t.banned : filter === "active" ? !t.banned : filter === "short" ? t.players < SQUAD : true));

  return (
    <div className="space-y-6">
      {data && data.pendingRequests > 0 && (
        <Alert tone="warn">
          <strong>{data.pendingRequests} team{data.pendingRequests === 1 ? " is" : "s are"} waiting for your approval.</strong>{" "}
          <button type="button" className="font-bold underline" onClick={() => goTo("teamRequests")}>
            Review requests
          </button>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Teams" value={counts.all} icon={LuUsersRound} tone="green" />
        <Stat label="Banned" value={counts.banned} hint="Cannot play right now" icon={LuBan} tone={counts.banned ? "red" : "slate"} onClick={() => setFilter("banned")} />
        <Stat label="Short squads" value={counts.short} hint={`Fewer than ${SQUAD} players`} icon={LuShirt} tone={counts.short ? "amber" : "slate"} onClick={() => setFilter("short")} />
        <Stat label="Requests" value={data ? data.pendingRequests : 0} hint="Waiting for approval" icon={LuInbox} tone={data && data.pendingRequests ? "amber" : "slate"} onClick={() => goTo("teamRequests")} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onChange={setFilter} tabs={FILTERS.map((f) => ({ ...f, count: f.id === "all" ? counts.all : counts[f.id] }))} />
        <div className="relative w-full lg:max-w-sm">
          <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input className={cx(field, "!pl-10")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a team, village or admin" aria-label="Search teams" />
        </div>
      </div>

      {loading && !data && <Spinner />}
      {error && <Alert tone="error">{error}</Alert>}
      {data && (
        <>
          {shown.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {shown.map((t) => (
                <TeamCard key={t.id} t={t} onOpen={() => open(t.id)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={LuUsersRound} title="No team matches" action={filter !== "all" || q ? <Button variant="secondary" onClick={() => { setFilter("all"); setQ(""); }}>Clear filters</Button> : null}>
              Try another search or filter.
            </EmptyState>
          )}
        </>
      )}
    </div>
  );
};

export default AssociationTeams;
