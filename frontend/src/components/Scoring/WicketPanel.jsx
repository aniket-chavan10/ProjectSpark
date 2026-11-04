import { useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "../ui/kit";
import { ActionShell, CButton, Choice, Kbd, Label } from "./console";
import { DELIVERIES, DISMISSALS, dismissalBlocked, wicketDelivery } from "./scoreUtils";

const SHORT = { "obstructing the field": "Obstructing", "hit the ball twice": "Hit twice" };

/**
 * A wicket, on one screen in the middle of the console: how, who, which fielder, what was run.
 * Everything that is needed appears as soon as the dismissal is chosen; nothing is hidden behind a scroll or a next step.
 * Keys: 1-8 choose the dismissal, Enter confirms, Esc cancels.
 */
export default function WicketPanel({ striker, nonStriker, fielders, bowlerId, freeHit, onSubmit, onClose, busy }) {
  const [type, setType] = useState(null);
  const [delivery, setDelivery] = useState("normal");
  const [runs, setRuns] = useState(0);
  const [outId, setOutId] = useState(striker.playerId);
  const [fielderId, setFielderId] = useState("");

  const dismissal = DISMISSALS.find((d) => d.id === type) || null;
  const blockedFor = (d) => dismissalBlocked(d, { freeHit, delivery });

  // what a dismissal allows: dead-ball dismissals add no runs; only a wide can still keep its penalty run
  const deliveries = useMemo(() => {
    if (!dismissal) return DELIVERIES;
    if (dismissal.dead) return DELIVERIES.filter((d) => ["normal", "wide"].includes(d.id) && !(freeHit && d.id === "wide"));
    return DELIVERIES;
  }, [dismissal, freeHit]);

  const keeper = fielders.find((p) => p.isKeeper);

  const pickType = (d) => {
    if (blockedFor(d)) return;
    setType(d.id);
    if (d.who === "striker") setOutId(striker.playerId);
    if (d.dead) setRuns(0);
    if (d.fielder === "none") setFielderId("");
    if (d.id === "stumped" && keeper) setFielderId(String(keeper.playerId));
    if (d.id !== "stumped" && type === "stumped") setFielderId(""); // the keeper was only suggested for a stumping
  };

  const pickDelivery = (id) => {
    setDelivery(id);
    setRuns(id === "bye" || id === "leg-bye" ? 1 : 0);
    if (type) {
      const d = DISMISSALS.find((x) => x.id === type);
      if (dismissalBlocked(d, { freeHit, delivery: id })) setType(null);
    }
  };

  const runOptions = delivery === "bye" || delivery === "leg-bye" ? [1, 2, 3] : [0, 1, 2, 3];
  const showRuns = dismissal && !dismissal.dead && dismissal.id === "run out";
  const needsFielder = dismissal && dismissal.fielder === "required";
  const canSubmit = !!dismissal && (!needsFielder || fielderId) && !busy;

  const submit = () => {
    if (!canSubmit) return;
    const d = wicketDelivery({ delivery, runs: dismissal.dead ? 0 : runs });
    onSubmit({
      ...d,
      isWicket: 1,
      wicketType: dismissal.id,
      dismissedPlayerId: dismissal.who === "striker" ? striker.playerId : Number(outId),
      fielderId: fielderId ? Number(fielderId) : null,
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "Enter") submit();
      else if (/^[1-8]$/.test(e.key)) pickType(DISMISSALS[Number(e.key) - 1]);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const outBatter = dismissal && dismissal.who === "striker" ? striker : [striker, nonStriker].find((b) => b && Number(b.playerId) === Number(outId));
  const fielderName = fielders.find((p) => String(p.playerId) === String(fielderId));
  const summary = dismissal ? `${outBatter ? outBatter.name : ""} · ${dismissal.label}${fielderName ? ` · ${fielderName.name}` : ""}${delivery !== "normal" ? ` · off a ${delivery}` : ""}` : "Choose how the batter got out";

  return (
    <ActionShell
      tone="danger"
      title="Wicket"
      subtitle={freeHit ? "Free hit: only a run out or obstructing the field can get the batter out." : `${striker.name} is on strike.`}
      onBack={onClose}
      footer={
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-400">{summary}</p>
          <CButton variant="danger" size="lg" disabled={!canSubmit} onClick={submit}>
            {busy ? "Saving…" : "Confirm wicket"} <Kbd>Enter</Kbd>
          </CButton>
        </div>
      }
    >
      <div className="space-y-4">
        <section>
          <Label>How was the batter out?</Label>
          <div className="grid grid-cols-4 gap-2">
            {DISMISSALS.map((d, i) => (
              <Choice key={d.id} tone="danger" on={type === d.id} disabled={!!blockedFor(d)} title={blockedFor(d) || ""} onClick={() => pickType(d)} className="h-11">
                <span className="mr-1.5 text-[10px] font-bold opacity-50">{i + 1}</span>
                {SHORT[d.id] || d.label}
              </Choice>
            ))}
          </div>
        </section>

        {dismissal && (dismissal.who === "either" || showRuns) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {dismissal.who === "either" && (
              <section>
                <Label>Who is out?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[striker, nonStriker].filter(Boolean).map((b) => (
                    <Choice key={b.playerId} tone="danger" on={Number(outId) === b.playerId} onClick={() => setOutId(b.playerId)} className="flex h-14 items-center gap-2 !px-2 text-left">
                      <PlayerAvatar name={b.name} photo={b.profilePicture} id={b.playerId} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate">{b.name}</span>
                        <span className="block text-[10px] font-medium uppercase opacity-70">{b.isOnStrike ? "On strike" : "Non-striker"}</span>
                      </span>
                    </Choice>
                  ))}
                </div>
              </section>
            )}
            {showRuns && (
              <section>
                <Label>{delivery === "wide" ? "Extra runs completed" : delivery === "bye" || delivery === "leg-bye" ? "Runs completed" : "Runs completed before the run out"}</Label>
                <div className="flex gap-2">
                  {runOptions.map((r) => (
                    <Choice key={r} on={runs === r} onClick={() => setRuns(r)} className="h-14 flex-1 font-display text-xl">
                      {r}
                    </Choice>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {dismissal && dismissal.fielder !== "none" && (
          <section>
            <Label>
              {dismissal.id === "caught" ? "Caught by" : dismissal.id === "stumped" ? "Wicket-keeper" : "Fielder"} · {needsFielder ? "required" : "optional"}
              {dismissal.id === "caught" ? " · leave empty or choose the bowler for caught & bowled" : ""}
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">
              {fielders.map((p) => (
                <Choice key={p.playerId} on={String(fielderId) === String(p.playerId)} onClick={() => setFielderId(String(fielderId) === String(p.playerId) && !needsFielder ? "" : String(p.playerId))} className="flex h-10 items-center gap-1.5 !px-1.5 text-left text-[12px]">
                  <PlayerAvatar name={p.name} photo={p.profilePicture} id={p.playerId} size={24} />
                  <span className="min-w-0 truncate">
                    {p.name}
                    {Number(p.playerId) === Number(bowlerId) ? " (b)" : p.isKeeper ? " (wk)" : ""}
                  </span>
                </Choice>
              ))}
            </div>
          </section>
        )}

        <section>
          <Label>The delivery</Label>
          <div className="inline-flex flex-wrap gap-1.5">
            {deliveries.map((d) => (
              <Choice key={d.id} on={delivery === d.id} onClick={() => pickDelivery(d.id)} className="h-9">
                {d.label}
              </Choice>
            ))}
          </div>
          {dismissal && dismissal.dead && delivery === "wide" && <p className="mt-1.5 text-xs text-zinc-500">The wide still counts as 1 run. No runs can follow a ball that is dead.</p>}
        </section>
      </div>
    </ActionShell>
  );
}
