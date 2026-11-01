import React, { useEffect, useMemo, useState } from "react";
import { LuArrowRight, LuCircleCheck, LuEraser, LuGripVertical, LuPencil, LuShuffle } from "react-icons/lu";
import { Alert, Badge, Button, Card, CardHeader, cx, EmptyState, Tabs, TeamLogo } from "../../ui/kit";
import { validLayouts } from "./TeamsStep";

const LETTERS = ["A", "B", "C", "D"];
const isPowerOfTwo = (n) => n >= 2 && (n & (n - 1)) === 0;

const shuffled = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function TeamChip({ team, groups, value, onMove, onDragStart, disabled }) {
  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(team.team_id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart && onDragStart(team.team_id);
      }}
      className={cx("flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm", !disabled && "cursor-grab active:cursor-grabbing hover:border-emerald-300")}
    >
      {!disabled && <LuGripVertical className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />}
      <TeamLogo team={{ id: team.team_id, name: team.team_name, logo: team.logo }} size={28} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{team.team_name}</span>
      {!disabled && (
        <select aria-label={`Group for ${team.team_name}`} value={value || ""} onChange={(e) => onMove(team.team_id, e.target.value || null)} className="rounded-md border border-slate-200 bg-slate-50 py-1 pl-2 pr-6 text-xs font-semibold text-slate-700">
          <option value="">–</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// Step 3: put the teams into groups. Drag a team onto a group (or use the little menu), or draw them at random.
export default function GroupsStep({ teams = [], locked, onSave, onContinue }) {
  const active = useMemo(() => teams.filter((t) => t.status !== "cancelled"), [teams]);
  const savedCount = new Set(active.map((t) => t.group_name).filter(Boolean)).size;
  const alreadySaved = active.length > 0 && active.every((t) => t.group_name);

  const [assign, setAssign] = useState({});
  const [count, setCount] = useState(4);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(null);

  // start from what is saved; otherwise pick a layout that fits the number of teams
  useEffect(() => {
    setAssign(Object.fromEntries(active.map((t) => [t.team_id, t.group_name || null])));
    const fits = validLayouts(active.length);
    setCount(savedCount >= 2 ? savedCount : fits.length ? fits[fits.length - 1].groups : 4);
    setEditing(!alreadySaved);
  }, [teams]); // eslint-disable-line react-hooks/exhaustive-deps

  const letters = LETTERS.slice(0, count);
  const byGroup = Object.fromEntries(letters.map((g) => [g, active.filter((t) => assign[t.team_id] === g)]));
  const pool = active.filter((t) => !letters.includes(assign[t.team_id]));

  const move = (teamId, group) => setAssign((a) => ({ ...a, [teamId]: group }));
  const draw = () => {
    const order = shuffled(active);
    setAssign(Object.fromEntries(order.map((t, i) => [t.team_id, letters[i % letters.length]])));
  };
  const clear = () => setAssign(Object.fromEntries(active.map((t) => [t.team_id, null])));
  const changeCount = (n) => {
    setCount(n);
    // teams that sat in a group that no longer exists go back to the pool
    setAssign((a) => Object.fromEntries(Object.entries(a).map(([id, g]) => [id, g && LETTERS.indexOf(g) < n ? g : null])));
  };

  const sizes = letters.map((g) => byGroup[g].length);
  const equal = new Set(sizes).size === 1;
  const problem = !active.length
    ? "There are no teams to group."
    : pool.length
      ? `${pool.length} team${pool.length === 1 ? " is" : "s are"} not in a group yet.`
      : !equal
        ? "Every group needs the same number of teams."
        : !isPowerOfTwo(sizes[0])
          ? `Groups of ${sizes[0]} do not work. Each group needs 2, 4, 8 or 16 teams.`
          : "";

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(active.map((t) => ({ team_id: t.team_id, group_name: assign[t.team_id] })));
      setEditing(false);
    } catch (e) {
      setError(e.message || "Could not save the groups.");
    } finally {
      setSaving(false);
    }
  };

  if (!active.length) {
    return (
      <EmptyState icon={LuCircleCheck} title="No teams to group">
        Go back to the Teams step and wait for applications.
      </EmptyState>
    );
  }

  const readOnly = !editing || locked;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title={readOnly ? "Groups" : "Make the groups"}
          subtitle={readOnly ? (locked ? "Matches have started, so the groups are fixed." : "These are the saved groups.") : "Drag a team onto a group, or use the menu beside its name. Teams in the same group play each other."}
          actions={
            readOnly ? (
              <>
                {!locked && (
                  <Button variant="secondary" icon={LuPencil} onClick={() => setEditing(true)}>
                    Change groups
                  </Button>
                )}
                <Button iconRight={LuArrowRight} onClick={onContinue}>
                  Continue to schedule
                </Button>
              </>
            ) : null
          }
        />

        {!readOnly && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Tabs
              value={count}
              onChange={changeCount}
              tabs={[
                { id: 2, label: "2 groups" },
                { id: 4, label: "4 groups" },
              ]}
            />
            <Button variant="secondary" size="sm" icon={LuShuffle} onClick={draw}>
              Draw at random
            </Button>
            <Button variant="ghost" size="sm" icon={LuEraser} onClick={clear}>
              Clear
            </Button>
            <span className="ml-auto text-xs text-slate-500">{active.length} teams</span>
          </div>
        )}
      </Card>

      {!readOnly && pool.length > 0 && (
        <Card className="bg-slate-50/70">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Not in a group yet</h3>
            <Badge tone="amber">{pool.length}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pool.map((t) => (
              <TeamChip key={t.team_id} team={t} groups={letters} value={assign[t.team_id]} onMove={move} />
            ))}
          </div>
        </Card>
      )}

      <div className={cx("grid gap-4", count === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4")}>
        {letters.map((g) => {
          const list = byGroup[g];
          const ok = list.length > 0 && isPowerOfTwo(list.length);
          return (
            <section
              key={g}
              aria-label={`Group ${g}`}
              onDragOver={(e) => {
                if (readOnly) return;
                e.preventDefault();
                setOver(g);
              }}
              onDragLeave={() => setOver((o) => (o === g ? null : o))}
              onDrop={(e) => {
                if (readOnly) return;
                e.preventDefault();
                setOver(null);
                const id = Number(e.dataTransfer.getData("text/plain"));
                if (id) move(id, g);
              }}
              className={cx("rounded-xl border bg-white shadow-card transition-colors", over === g ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-slate-200")}
            >
              <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-900 text-sm font-bold text-white">{g}</span>
                  <h3 className="text-sm font-semibold text-slate-900">Group {g}</h3>
                </div>
                <Badge tone={ok ? "green" : list.length ? "amber" : "slate"}>
                  {list.length} team{list.length === 1 ? "" : "s"}
                </Badge>
              </header>
              <div className="min-h-[7rem] space-y-2 p-3">
                {list.map((t) => (
                  <TeamChip key={t.team_id} team={t} groups={letters} value={assign[t.team_id]} onMove={move} disabled={readOnly} />
                ))}
                {!list.length && <p className="py-6 text-center text-xs text-slate-400">{readOnly ? "No teams" : "Drop teams here"}</p>}
              </div>
            </section>
          );
        })}
      </div>

      {!readOnly && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-raised backdrop-blur">
          <p className={cx("text-sm", problem ? "text-amber-800" : "text-emerald-800")}>{problem || `Ready: ${count} groups of ${sizes[0]}.`}</p>
          <div className="flex gap-2">
            {alreadySaved && (
              <Button variant="secondary" onClick={() => { setEditing(false); setAssign(Object.fromEntries(active.map((t) => [t.team_id, t.group_name || null]))); }}>
                Cancel
              </Button>
            )}
            <Button disabled={!!problem} busy={saving} onClick={save} iconRight={LuArrowRight}>
              Save groups
            </Button>
          </div>
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
