import React, { useEffect, useMemo, useState } from "react";
import { LuArrowRight, LuCalendarDays, LuCircleCheck, LuRepeat, LuSearch, LuShieldAlert, LuTriangleAlert } from "react-icons/lu";
import api from "../../../api/tournamentApi1";
import { Alert, Badge, Button, Dialog, Spinner, TeamLogo, cx } from "../../ui/kit";
import { field, label as labelClass } from "../../ui/classes";

const messageOf = (err, fallback) => (err && (err.error || err.message || err.response?.data?.error)) || fallback;

const when = (f) => [f.date && new Date(`${f.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }), f.time].filter(Boolean).join(", ");

/**
 * The host swaps a team that backed out for another registered team.
 * The new team takes the old team's group and every match that has not started; played matches stay as they are.
 *   teams     the tournament's current teams ({ team_id, team_name, logo, group_name, status })
 *   outTeam   a team to start with (optional): the dialog then opens on the "who comes in" step
 *   onDone    called after a successful swap, so the screen can reload
 */
export default function ReplaceTeamDialog({ tournamentId, teams, outTeam, onClose, onDone }) {
  const active = useMemo(() => teams.filter((t) => t.status !== "cancelled"), [teams]);
  const [outId, setOutId] = useState(outTeam ? outTeam.team_id : null);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [q, setQ] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [inTeam, setInTeam] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  const out = active.find((t) => t.team_id === outId);

  useEffect(() => {
    if (!outId) return undefined;
    let alive = true;
    setPreview(null);
    setError("");
    setPreviewing(true);
    api
      .previewReplacement(tournamentId, outId)
      .then((p) => alive && setPreview(p))
      .catch((e) => alive && setError(messageOf(e, "Could not check this team.")))
      .finally(() => alive && setPreviewing(false));
    return () => {
      alive = false;
    };
  }, [tournamentId, outId]);

  useEffect(() => {
    if (!outId) return undefined;
    let alive = true;
    setLoadingCandidates(true);
    const timer = setTimeout(() => {
      api
        .getReplacementCandidates(tournamentId, q)
        .then((items) => alive && setCandidates(items))
        .catch((e) => alive && setError(messageOf(e, "Could not load the teams.")))
        .finally(() => alive && setLoadingCandidates(false));
    }, q ? 250 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [tournamentId, outId, q]);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.replaceTeam(tournamentId, { outTeamId: outId, inTeamId: inTeam.id, reason });
      setDone(res);
    } catch (e) {
      setError(messageOf(e, "Could not replace the team."));
    }
    setBusy(false);
  };

  /* ------------------------------ finished ------------------------------ */
  if (done) {
    return (
      <Dialog title="Team replaced" onClose={() => onDone(done)} footer={<div className="flex justify-end"><Button onClick={() => onDone(done)}>Done</Button></div>}>
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <LuCircleCheck className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="mt-4 text-lg font-extrabold text-ink-950">
            {done.inTeam.name} <span className="text-slate-400">is in for</span> {done.outTeam.name}
          </p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {done.group ? `Group ${done.group}. ` : ""}
            {done.fixturesMoved} match{done.fixturesMoved === 1 ? "" : "es"} handed over
            {done.played ? `, ${done.played} already played stay${done.played === 1 ? "s" : ""} in the books for ${done.outTeam.name}` : ""}. Both teams and the opponents were notified.
          </p>
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{done.inTeam.name} must name its squad before the toss.</p>
        </div>
      </Dialog>
    );
  }

  /* ------------------------------ choosing ------------------------------ */
  return (
    <Dialog
      title="Replace a team"
      subtitle="A team backed out? Put another registered team in its place."
      onClose={onClose}
      width="max-w-2xl"
      locked={busy}
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-[14rem] flex-1 text-xs text-slate-500">This cannot be undone from here. The swap is recorded with your reason.</p>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button icon={LuRepeat} busy={busy} disabled={!inTeam || !preview || !preview.canReplace} onClick={confirm}>
              Replace {out ? out.team_name : "team"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {error && <Alert tone="error" onClose={() => setError("")}>{error}</Alert>}

        {/* 1 - who is leaving */}
        <section>
          <p className={labelClass}>1 · Which team is leaving?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {active.map((t) => (
              <button
                key={t.team_id}
                type="button"
                onClick={() => {
                  setOutId(t.team_id);
                  setInTeam(null);
                }}
                className={cx("flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition", outId === t.team_id ? "border-spark-500 bg-spark-50 ring-2 ring-spark-500/20" : "border-ink-100 bg-white hover:border-ink-300")}
              >
                <TeamLogo team={{ id: t.team_id, name: t.team_name, logo: t.logo }} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-900">{t.team_name}</span>
                {t.group_name && <Badge tone="slate">Group {t.group_name}</Badge>}
              </button>
            ))}
            {!active.length && <p className="text-sm text-slate-500">No teams have registered yet.</p>}
          </div>
        </section>

        {/* what it means */}
        {outId && (
          <section className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
            {previewing || !preview ? (
              error ? null : <Spinner label="Checking the matches…" className="!py-2" />
            ) : (
              <div className="space-y-3 text-sm">
                {preview.blocked.length > 0 && (
                  <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-red-900">
                    <LuShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>
                      <b>{preview.team.name}</b> has a match that has already started (Match {preview.blocked[0].matchNo} against {preview.blocked[0].opponent || "its opponent"}). Finish or abandon it first, then replace the team.
                    </p>
                  </div>
                )}
                {preview.closed && <Alert tone="warning">This tournament is finished, so teams can no longer be replaced.</Alert>}
                <div>
                  <p className="font-bold text-ink-900">
                    The new team takes over {preview.takesOver.length} match{preview.takesOver.length === 1 ? "" : "es"}
                    {preview.team.group ? ` in Group ${preview.team.group}` : ""}
                  </p>
                  {preview.takesOver.length > 0 ? (
                    <ul className="mt-2 divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100 bg-white">
                      {preview.takesOver.map((f) => (
                        <li key={f.fixtureId} className="flex items-center gap-3 px-3 py-2">
                          <span className="tabular w-14 text-xs font-extrabold text-ink-400">M{f.matchNo}</span>
                          <span className="min-w-0 flex-1 truncate text-ink-800">vs {f.opponent || "winner of an earlier match"}</span>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <LuCalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                            {when(f) || "time to be set"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-500">No matches to hand over yet (the schedule has not been made, or all its matches are played).</p>
                  )}
                </div>
                {preview.played.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {preview.played.length} match{preview.played.length === 1 ? "" : "es"} already played {preview.played.length === 1 ? "stays" : "stay"} with {preview.team.name}: results and points are not changed.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* 2 - who comes in */}
        {outId && preview && preview.canReplace && (
          <section>
            <p className={labelClass}>2 · Who takes the place?</p>
            <div className="relative">
              <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input className={cx(field, "!pl-10")} placeholder="Search registered teams…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search teams" />
            </div>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-ink-100">
              {loadingCandidates && !candidates.length ? (
                <Spinner label="Loading teams…" className="!py-4" />
              ) : candidates.length ? (
                <ul className="divide-y divide-ink-100">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => setInTeam(c)} className={cx("flex w-full items-center gap-3 px-3 py-2.5 text-left transition", inTeam && inTeam.id === c.id ? "bg-spark-50" : "hover:bg-ink-50")}>
                        <TeamLogo team={{ id: c.id, name: c.name, logo: c.logo }} size={32} />
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-900">{c.name}</span>
                        <span className={cx("tabular text-xs", c.players < 11 ? "font-bold text-amber-700" : "text-slate-500")}>
                          {c.players} player{c.players === 1 ? "" : "s"}
                        </span>
                        {inTeam && inTeam.id === c.id && <LuCircleCheck className="h-5 w-5 text-spark-600" aria-hidden="true" />}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-slate-500">No team matches. Only registered teams that are not banned and not already in this tournament can be brought in.</p>
              )}
            </div>
            {inTeam && inTeam.players < 11 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <LuTriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> {inTeam.name} has only {inTeam.players} player{inTeam.players === 1 ? "" : "s"} registered; a squad needs 11.
              </p>
            )}
          </section>
        )}

        {/* 3 - why */}
        {outId && preview && preview.canReplace && (
          <section>
            <label htmlFor="replace-reason" className={labelClass}>
              3 · Reason (optional, shown to the association)
            </label>
            <input id="replace-reason" className={field} maxLength={300} placeholder="For example: could not field a side" value={reason} onChange={(e) => setReason(e.target.value)} />
          </section>
        )}

        {inTeam && out && preview && preview.canReplace && (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-ink-950 px-4 py-3 text-sm font-bold text-white">
            <span className="truncate text-ink-300 line-through decoration-spark-400">{out.team_name}</span>
            <LuArrowRight className="h-4 w-4 shrink-0 text-spark-400" aria-hidden="true" />
            <span className="truncate">{inTeam.name}</span>
          </div>
        )}
      </div>
    </Dialog>
  );
}
