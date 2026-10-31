import { useMemo, useState } from "react";
import Modal from "./Modal";
import { btn, field, label } from "../ui/classes";
import { DELIVERIES, DISMISSALS, dismissalBlocked, wicketDelivery } from "./scoreUtils";

const Chip = ({ on, disabled, onClick, children, title }) => (
  <button
    type="button"
    disabled={disabled}
    title={title}
    aria-pressed={on}
    onClick={onClick}
    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
      on ? "border-red-600 bg-red-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    } disabled:cursor-not-allowed disabled:opacity-40`}
  >
    {children}
  </button>
);

/** Everything about a dismissal: how, who, which fielder, what was run. Sends the delivery the way the server wants it. */
export default function WicketModal({ striker, nonStriker, fielders, freeHit, onSubmit, onClose, busy }) {
  const [type, setType] = useState(null);
  const [delivery, setDelivery] = useState("normal");
  const [runs, setRuns] = useState(0);
  const [outId, setOutId] = useState(striker.playerId);
  const [fielderId, setFielderId] = useState("");

  const dismissal = DISMISSALS.find((d) => d.id === type) || null;
  const context = { freeHit, delivery };
  const blockedFor = (d) => dismissalBlocked(d, context);

  // what a dismissal allows: dead-ball dismissals add no runs; only a wide can still keep its penalty run
  const deliveries = useMemo(() => {
    if (!dismissal) return DELIVERIES;
    if (dismissal.dead) return DELIVERIES.filter((d) => ["normal", "wide"].includes(d.id) && !(freeHit && d.id === "wide"));
    return DELIVERIES;
  }, [dismissal, freeHit]);

  const pickType = (d) => {
    setType(d.id);
    if (d.who === "striker") setOutId(striker.playerId);
    if (d.dead) setRuns(0);
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
    const d = wicketDelivery({ delivery, runs: dismissal.dead ? 0 : runs });
    onSubmit({
      ...d,
      isWicket: 1,
      wicketType: dismissal.id,
      dismissedPlayerId: dismissal.who === "striker" ? striker.playerId : Number(outId),
      fielderId: fielderId ? Number(fielderId) : null,
    });
  };

  return (
    <Modal
      title="Wicket"
      subtitle={freeHit ? "Free hit: only a run out or obstructing the field can get the batter out" : undefined}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-slate-300" disabled={!canSubmit} onClick={submit}>
            {busy ? "Saving…" : "Confirm wicket"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className={label}>How was he out?</h3>
          <div className="flex flex-wrap gap-2">
            {DISMISSALS.map((d) => (
              <Chip key={d.id} on={type === d.id} disabled={!!blockedFor(d)} title={blockedFor(d) || ""} onClick={() => pickType(d)}>
                {d.label}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <h3 className={label}>The delivery</h3>
          <div className="flex flex-wrap gap-2">
            {deliveries.map((d) => (
              <Chip key={d.id} on={delivery === d.id} onClick={() => pickDelivery(d.id)}>
                {d.label}
              </Chip>
            ))}
          </div>
          {dismissal && dismissal.dead && delivery === "wide" && <p className="mt-1.5 text-xs text-slate-500">The wide still counts as 1 run. No runs can follow a ball that is dead.</p>}
        </section>

        {dismissal && dismissal.who === "either" && (
          <section>
            <h3 className={label}>Who is out?</h3>
            <div className="flex flex-wrap gap-2">
              {[striker, nonStriker].filter(Boolean).map((b) => (
                <Chip key={b.playerId} on={Number(outId) === b.playerId} onClick={() => setOutId(b.playerId)}>
                  {b.name} {b.isOnStrike ? "(on strike)" : "(non-striker)"}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {showRuns && (
          <section>
            <h3 className={label}>{delivery === "wide" ? "Extra runs completed (besides the wide)" : delivery === "bye" || delivery === "leg-bye" ? "Runs completed" : "Runs completed before the run out"}</h3>
            <div className="flex gap-2">
              {runOptions.map((r) => (
                <Chip key={r} on={runs === r} onClick={() => setRuns(r)}>
                  {r}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {dismissal && dismissal.fielder !== "none" && (
          <section>
            <label className={label} htmlFor="fielder">
              {dismissal.id === "caught" ? "Caught by" : dismissal.id === "stumped" ? "Wicket-keeper" : "Fielder"} {needsFielder ? "(required)" : "(optional)"}
            </label>
            <select id="fielder" className={field} value={fielderId} onChange={(e) => setFielderId(e.target.value)}>
              <option value="">{needsFielder ? "Choose a fielder" : "Not recorded"}</option>
              {fielders.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.name}
                </option>
              ))}
            </select>
            {dismissal.id === "caught" && <p className="mt-1 text-xs text-slate-500">Leave it empty, or pick the bowler, for “caught &amp; bowled”.</p>}
          </section>
        )}
      </div>
    </Modal>
  );
}
