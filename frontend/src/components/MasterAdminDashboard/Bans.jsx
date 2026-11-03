import React, { useEffect, useMemo, useState } from "react";
import { LuBan, LuCalendarClock, LuHistory, LuShieldCheck, LuShirt, LuUsersRound } from "react-icons/lu";
import { associationApi, shortDate } from "../../api/sparkApi";
import { Alert, Badge, Button, Card, cx, Dialog, EmptyState, PlayerAvatar, Spinner, Stat, Tabs } from "../ui/kit";
import { field, label } from "../ui/classes";
import { useDebounced } from "../Public/ui";

const TONE = { active: "red", upcoming: "amber", expired: "slate", revoked: "green" };

function BanCard({ b, onLift }) {
  const live = b.status === "active" || b.status === "upcoming";
  return (
    <li className={cx("rounded-2xl border bg-white p-4 shadow-card", b.status === "active" ? "border-red-200" : "border-ink-100")}>
      <div className="flex items-start gap-3">
        {b.subjectType === "player" ? (
          <PlayerAvatar name={b.subjectName || ""} id={b.subjectId} size={44} />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-white">
            <LuUsersRound className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold text-ink-950">
            <span className="truncate">{b.subjectName || `#${b.subjectId}`}</span>
            <Badge tone={TONE[b.status]}>{b.status}</Badge>
          </p>
          {b.teamName && <p className="text-xs font-semibold text-ink-500">of {b.teamName}</p>}
          <p className="mt-1.5 text-sm text-ink-700">{b.reason}</p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500">
            <LuCalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            {shortDate(b.startsOn)} to {b.endsOn ? shortDate(b.endsOn) : "until lifted"}
          </p>
          {b.revokedAt && (
            <p className="mt-1 text-xs text-ink-500">
              Lifted {shortDate(b.revokedAt)}
              {b.revokeReason ? `: ${b.revokeReason}` : ""}
            </p>
          )}
        </div>
        {live && onLift && (
          <Button size="sm" variant="secondary" onClick={() => onLift(b)}>
            Lift
          </Button>
        )}
      </div>
    </li>
  );
}

function BanDialog({ onClose, onDone, initialType = "team" }) {
  const [type, setType] = useState(initialType);
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const [found, setFound] = useState({ teams: [], players: [] });
  const [subject, setSubject] = useState(null);
  const [reason, setReason] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (subject || search.trim().length < 2) {
      setFound({ teams: [], players: [] });
      return;
    }
    associationApi.searchBanSubjects(search).then(setFound).catch(() => {});
  }, [search, subject]);

  const choices = type === "team" ? found.teams : found.players;
  const today = new Date().toISOString().slice(0, 10);

  const submit = async (e) => {
    e.preventDefault();
    if (!subject) return setError(`Search and choose the ${type} to ban.`);
    setBusy(true);
    setError("");
    try {
      await associationApi.ban({ subjectType: type, subjectId: subject.id, reason, endsOn: endsOn || null });
      onDone(`${subject.name} is banned${endsOn ? ` until ${shortDate(endsOn)}` : " until you lift it"}. Their team has been told.`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="Ban a team or a player"
      subtitle="A banned team cannot enter or start matches. A banned player cannot be picked for a squad."
      onClose={onClose}
      locked={busy}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" form="ban-form" busy={busy} icon={LuBan}>
            Ban
          </Button>
        </div>
      }
    >
      <form id="ban-form" onSubmit={submit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="inline-flex rounded-xl bg-ink-100/70 p-1" role="radiogroup" aria-label="Who to ban">
          {["team", "player"].map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => {
                setType(t);
                setSubject(null);
                setQ("");
              }}
              className={cx("rounded-lg px-4 py-1.5 text-sm font-bold transition", type === t ? "bg-red-600 text-white shadow-sm" : "text-ink-600 hover:text-ink-900")}
            >
              {t === "team" ? "A team" : "A player"}
            </button>
          ))}
        </div>

        <div className="relative">
          <label htmlFor="ban-q" className={label}>
            {type === "team" ? "Team name" : "Player name"}
          </label>
          {subject ? (
            <div className="flex items-center justify-between rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-2.5 text-sm">
              <strong>{subject.name}</strong>
              <button type="button" className="font-bold text-spark-700 hover:underline" onClick={() => { setSubject(null); setQ(""); }}>
                Change
              </button>
            </div>
          ) : (
            <input id="ban-q" className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 2 letters" autoComplete="off" />
          )}
          {!subject && choices.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-ink-200 bg-white shadow-raised">
              {choices.map((c) => (
                <li key={c.id}>
                  <button type="button" className="block w-full px-3.5 py-2.5 text-left text-sm hover:bg-spark-50" onClick={() => setSubject({ id: c.id, name: c.name })}>
                    <span className="font-semibold text-ink-900">{c.name}</span> {c.teamName && <span className="text-xs text-ink-500">· {c.teamName}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ban-end" className={label}>
              Last day (empty = no end)
            </label>
            <input id="ban-end" type="date" min={today} className={field} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ban-why" className={label}>
              Reason
            </label>
            <input id="ban-why" className={field} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required />
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function LiftDialog({ ban, onClose, onDone }) {
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lift = async () => {
    setBusy(true);
    try {
      await associationApi.revokeBan(ban.id, why);
      onDone(`The ban on ${ban.subjectName} is lifted.`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Dialog
      title={`Lift the ban on ${ban.subjectName}?`}
      subtitle="They can play again straight away."
      onClose={onClose}
      locked={busy}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Keep the ban
          </Button>
          <Button busy={busy} icon={LuShieldCheck} onClick={lift}>
            Lift the ban
          </Button>
        </div>
      }
    >
      {error && <Alert tone="error" className="mb-3">{error}</Alert>}
      <label htmlFor="lift-why" className={label}>
        Note (optional)
      </label>
      <input id="lift-why" className={field} value={why} onChange={(e) => setWhy(e.target.value)} maxLength={300} placeholder="For example: apology received" />
    </Dialog>
  );
}

// Who is banned (teams and players), for how long and why; ban someone; lift a ban early. Every ban is kept in the history.
export default function Bans() {
  const [all, setAll] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [tab, setTab] = useState("force");
  const [banning, setBanning] = useState(false);
  const [lifting, setLifting] = useState(null);

  const load = () => associationApi.bans({ filter: "all" }).then(setAll).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const split = useMemo(() => {
    const list = all || [];
    const live = list.filter((b) => b.status === "active" || b.status === "upcoming");
    return { live, teams: live.filter((b) => b.subjectType === "team"), players: live.filter((b) => b.subjectType === "player"), history: list };
  }, [all]);

  const finish = (msg) => {
    setBanning(false);
    setLifting(null);
    setDone(msg);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-600">A banned team cannot enter a tournament or start a match. A banned player cannot be named in a squad. The team is told when you ban or lift.</p>
        <Button variant="danger" icon={LuBan} onClick={() => setBanning(true)}>
          Ban a team or player
        </Button>
      </div>

      {error && <Alert tone="error" onClose={() => setError("")}>{error}</Alert>}
      {done && <Alert tone="success" onClose={() => setDone("")}>{done}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Banned teams" value={all ? split.teams.length : "…"} icon={LuUsersRound} tone={split.teams.length ? "red" : "slate"} />
        <Stat label="Banned players" value={all ? split.players.length : "…"} icon={LuShirt} tone={split.players.length ? "red" : "slate"} />
        <Stat label="On record" value={all ? all.length : "…"} hint="Including lifted and finished bans" icon={LuHistory} tone="slate" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "force", label: "In force", icon: LuBan, count: all ? split.live.length : undefined },
          { id: "history", label: "History", icon: LuHistory, count: all ? all.length : undefined },
        ]}
      />

      {!all && !error && <Spinner />}

      {all && tab === "force" && (
        <div className="grid gap-6 xl:grid-cols-2">
          {[
            ["Teams", split.teams, "No team is banned."],
            ["Players", split.players, "No player is banned."],
          ].map(([title, list, none]) => (
            <section key={title} aria-label={`Banned ${title.toLowerCase()}`}>
              <h2 className="mb-3 font-display text-2xl font-extrabold uppercase tracking-wide text-ink-950">
                {title} <span className="text-ink-400">{list.length}</span>
              </h2>
              {list.length ? (
                <ul className="space-y-3">
                  {list.map((b) => (
                    <BanCard key={b.id} b={b} onLift={setLifting} />
                  ))}
                </ul>
              ) : (
                <Card>
                  <EmptyState icon={LuShieldCheck} title={none}>Clean record for now.</EmptyState>
                </Card>
              )}
            </section>
          ))}
        </div>
      )}

      {all && tab === "history" &&
        (split.history.length ? (
          <ul className="grid gap-3 xl:grid-cols-2">
            {split.history.map((b) => (
              <BanCard key={b.id} b={b} onLift={setLifting} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={LuHistory} title="No bans yet">Bans you issue are kept here.</EmptyState>
        ))}

      {banning && <BanDialog onClose={() => setBanning(false)} onDone={finish} />}
      {lifting && <LiftDialog ban={lifting} onClose={() => setLifting(null)} onDone={finish} />}
    </div>
  );
}
