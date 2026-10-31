import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api/tournamentApi1";
import { btn, card } from "../../ui/classes";
import DayBoard from "./DayBoard";
import GroupDraw from "./GroupDraw";
import Problems from "./Problems";
import SetupPanel from "./SetupPanel";
import TieRulesCard from "./TieRulesCard";
import { dayLabel, durationText } from "./timeUtils";

const isPowerOfTwo = (n) => n >= 2 && (n & (n - 1)) === 0;

const slotsToMap = (list) => Object.fromEntries((list || []).map((s) => [s.match_no, s]));

/**
 * The host's schedule screen: plan the days, arrange the first-round pairs, auto-fill the times,
 * adjust any match, and save once nothing clashes. The rules are checked on the server as you edit.
 */
export default function ScheduleBuilder({ tournamentId, onSaved }) {
  const [plan, setPlan] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [groups, setGroups] = useState([]);
  const [settings, setSettings] = useState(null);
  const [semiPairs, setSemiPairs] = useState([]);
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState(false);
  const [fixtures, setFixtures] = useState(null);
  const [slots, setSlots] = useState({});
  const [problems, setProblems] = useState({ errors: [], warnings: [] });
  const [building, setBuilding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [focus, setFocus] = useState(null);
  const touched = useRef(false); // has the host changed a match by hand?

  /* ------------------------------- load ------------------------------- */
  useEffect(() => {
    let cancelled = false;
    setPlan(null);
    setLoadError("");
    api
      .getSchedulePlan(tournamentId)
      .then((p) => {
        if (cancelled) return;
        setPlan(p);
        setGroups(p.groups);
        setSemiPairs(p.semiPairs);
        setThirdPlaceMatch(p.thirdPlaceMatch);
        setSettings({
          days: p.days,
          dayStart: p.defaults.dayStart,
          dayEnd: p.defaults.dayEnd,
          useBreak: !!p.defaults.breakStart,
          breakStart: p.defaults.breakStart || "13:00",
          breakEnd: p.defaults.breakEnd || "14:00",
          gapMinutes: p.defaults.gapMinutes,
          restFriendly: p.defaults.restFriendly,
          overs: p.defaults.overs,
        });
        if (p.fixtures) {
          setFixtures(p.fixtures);
          setSlots(slotsToMap(p.slots));
        }
      })
      .catch((e) => !cancelled && setLoadError(e.error || e.message || "Could not load the schedule"));
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  const locked = !!plan?.locked;
  const groupNames = groups.map((g) => g.group_name);

  /* ------------------------------ request bodies ------------------------------ */
  const structure = useMemo(
    () => ({
      groupOrders: Object.fromEntries(groups.map((g) => [g.group_name, g.teams.map((t) => t.id)])),
      semiPairs,
      thirdPlaceMatch,
    }),
    [groups, semiPairs, thirdPlaceMatch]
  );

  const settingsPayload = () => ({
    days: settings.days,
    dayStart: settings.dayStart,
    dayEnd: settings.dayEnd,
    breakStart: settings.useBreak ? settings.breakStart : null,
    breakEnd: settings.useBreak ? settings.breakEnd : null,
    gapMinutes: Number(settings.gapMinutes) || 0,
    restFriendly: settings.restFriendly,
    minRestMinutes: 30,
    overs: Object.fromEntries(Object.entries(settings.overs).filter(([, v]) => Number(v) > 0)),
  });

  /* ------------------------------ auto-fill ------------------------------ */
  const applyPreview = (res) => {
    setFixtures(res.fixtures);
    setSlots(slotsToMap(res.slots));
    setProblems({ errors: res.errors, warnings: res.warnings });
    touched.current = false;
    if (!res.fits) {
      setNotice({ type: "warn", text: `The matches need ${durationText(res.overflowMinutes)} more than the days you chose. Add playing time, shorten the gap, or play fewer overs.` });
    }
  };

  const autoFill = async (override = {}) => {
    setBuilding(true);
    setNotice(null);
    try {
      applyPreview(await api.previewSchedule(tournamentId, { ...structure, ...override, settings: settingsPayload() }));
    } catch (e) {
      setNotice({ type: "error", text: e.error || e.message || "Could not build the schedule" });
    } finally {
      setBuilding(false);
    }
  };

  const confirmRebuild = () =>
    !fixtures || !touched.current || window.confirm("This rebuilds the schedule and replaces the changes you made by hand. Continue?");

  const changeThirdPlace = async (value) => {
    if (!confirmRebuild()) return;
    setThirdPlaceMatch(value);
    if (fixtures) await autoFill({ thirdPlaceMatch: value });
  };

  const changeSemiPairs = async (pairs) => {
    if (!confirmRebuild()) return;
    setSemiPairs(pairs);
    if (fixtures) await autoFill({ semiPairs: pairs });
  };

  /* ------------------------------ editing + live check ------------------------------ */
  const onSlot = (matchNo, patch) => {
    touched.current = true;
    setSlots((prev) => ({ ...prev, [matchNo]: { ...prev[matchNo], ...patch } }));
  };

  useEffect(() => {
    if (!fixtures || locked || !settings) return undefined;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkSchedule(tournamentId, { ...structure, settings: settingsPayload(), slots: Object.values(slots) }, ctrl.signal);
        setProblems({ errors: res.errors, warnings: res.warnings });
      } catch (e) {
        if (!ctrl.signal.aborted) setNotice({ type: "error", text: e.error || "Could not check the schedule" });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [fixtures, slots, structure, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------ save ------------------------------ */
  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await api.saveSchedule(tournamentId, { ...structure, settings: settingsPayload(), slots: Object.values(slots) });
      setNotice({ type: "success", text: "Schedule saved." });
      if (onSaved) onSaved();
    } catch (e) {
      if (e.errors) setProblems({ errors: e.errors, warnings: e.warnings || [] });
      setNotice({ type: "error", text: e.error || e.message || "Could not save the schedule" });
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ derived ------------------------------ */
  const teamsOf = (fixture) => {
    if (fixture.stage === "group" && fixture.round === 1) {
      const g = groups.find((x) => x.group_name === fixture.group);
      const sameRound = (fixtures || []).filter((f) => f.group === fixture.group && f.round === 1).map((f) => f.match_no).sort((a, b) => a - b);
      const idx = sameRound.indexOf(fixture.match_no);
      return [g?.teams[2 * idx], g?.teams[2 * idx + 1]].map((t) => ({ text: t ? t.name : "TBD", known: !!t }));
    }
    return [fixture.team1Label, fixture.team2Label].map((t) => ({ text: t || "TBD", known: false }));
  };

  const oversKeys = useMemo(() => {
    const size = groups[0]?.teams.length || 8;
    const rounds = Math.max(1, Math.round(Math.log2(size)));
    const list = Array.from({ length: rounds }, (_, i) => ({ key: i + 1, name: i + 1 === rounds ? "Group final" : `Round ${i + 1}` }));
    if (groups.length === 4) list.push({ key: "semi", name: "Semi-finals" });
    if (thirdPlaceMatch) list.push({ key: "third_place", name: "Third place" });
    list.push({ key: "final", name: "Final" });
    return list;
  }, [groups, thirdPlaceMatch]);

  const groupProblem = useMemo(() => {
    if (!groups.length) return "No groups yet. Put the teams into groups first.";
    if (groups.length !== 2 && groups.length !== 4) return `There are ${groups.length} groups. A tournament needs 2 or 4 groups.`;
    const bad = groups.find((g) => !isPowerOfTwo(g.teams.length));
    if (bad) return `Group ${bad.group_name} has ${bad.teams.length} teams. Every group needs 2, 4, 8 or 16 teams.`;
    if (new Set(groups.map((g) => g.teams.length)).size > 1) return "All groups need the same number of teams.";
    return "";
  }, [groups]);

  const totalMinutes = Object.values(slots).reduce((a, s) => a + (Number(s.duration_minutes) || 0), 0);
  const canSave = !!fixtures && !problems.errors.length && !saving && !locked;

  /* ------------------------------ render ------------------------------ */
  if (loadError) return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">{loadError}</p>;
  if (!plan || !settings) return <p className="p-6 text-sm text-slate-500">Loading the schedule…</p>;

  if (groupProblem) {
    return (
      <div className={`${card} p-6 text-center`}>
        <p className="text-sm text-slate-700">{groupProblem}</p>
      </div>
    );
  }

  const noticeStyle = { error: "bg-red-50 text-red-700", warn: "bg-amber-50 text-amber-800", success: "bg-emerald-50 text-emerald-800" };

  return (
    <div className="space-y-6 pb-24">
      {locked && (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800" role="status">
          Matches have already started, so the schedule can no longer be changed.
        </p>
      )}
      {notice && (
        <p className={`rounded-lg p-4 text-sm ${noticeStyle[notice.type]}`} role={notice.type === "error" ? "alert" : "status"}>
          {notice.text}
        </p>
      )}

      <TieRulesCard tournamentId={tournamentId} />

      <SetupPanel
        plan={plan}
        settings={settings}
        onSettings={setSettings}
        thirdPlaceMatch={thirdPlaceMatch}
        onThirdPlace={changeThirdPlace}
        semiPairs={semiPairs}
        onSemiPairs={changeSemiPairs}
        groupNames={groupNames}
        oversKeys={oversKeys}
        onAutoFill={() => confirmRebuild() && autoFill()}
        building={building}
        hasSchedule={!!fixtures}
        disabled={locked}
      />

      <GroupDraw groups={groups} onChange={setGroups} disabled={locked} />

      <section aria-labelledby="board-title" className="space-y-4">
        <div>
          <h2 id="board-title" className="text-lg font-bold text-slate-900">
            3. Check the schedule
          </h2>
          <p className="text-sm text-slate-500">Open any match with Edit to change its day, time or overs. Clashes show up straight away.</p>
        </div>

        {!fixtures ? (
          <div className={`${card} p-8 text-center text-sm text-slate-500`}>Press “Auto-fill the schedule” above to lay out all the matches.</div>
        ) : (
          <>
            <Problems errors={problems.errors} warnings={problems.warnings} onFocus={setFocus} />
            <DayBoard days={plan.days} fixtures={fixtures} slots={slots} teamsOf={teamsOf} problems={[...problems.errors.map((p) => ({ ...p, level: "error" })), ...problems.warnings.map((p) => ({ ...p, level: "warning" }))]} onSlot={onSlot} readOnly={locked} focus={focus} />
          </>
        )}
      </section>

      {fixtures && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{fixtures.length} matches</span> · {durationText(totalMinutes)} of play · {settings.days.length} {settings.days.length === 1 ? "day" : "days"} ({settings.days.map(dayLabel).join(", ")})
              {problems.errors.length > 0 && <span className="ml-2 font-semibold text-red-600">{problems.errors.length} to fix</span>}
            </p>
            <button type="button" className={btn.primary} disabled={!canSave} onClick={save}>
              {saving ? "Saving…" : plan.saved ? "Save changes" : "Save schedule"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
