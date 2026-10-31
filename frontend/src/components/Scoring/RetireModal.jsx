import { useState } from "react";
import Modal from "./Modal";
import { btn } from "../ui/classes";

const Option = ({ on, onClick, title, hint }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`w-full rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
      on ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"
    }`}
  >
    <span className="block font-semibold text-slate-900">{title}</span>
    {hint && <span className="block text-xs text-slate-500">{hint}</span>}
  </button>
);

/** A batter leaves between balls: retired hurt (may return) or retired out (a wicket). Not a delivery. */
export default function RetireModal({ batters, onSubmit, onClose, busy }) {
  const [id, setId] = useState(batters[0]?.playerId);
  const [out, setOut] = useState(false);

  return (
    <Modal
      title="Batter retires"
      subtitle="This is not a ball: nothing is added to the score or the over."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btn.primary} disabled={!id || busy} onClick={() => onSubmit({ batsmanId: id, retiredOut: out })}>
            {busy ? "Saving…" : "Confirm"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Who retires?</h3>
          {batters.map((b) => (
            <Option key={b.playerId} on={id === b.playerId} onClick={() => setId(b.playerId)} title={b.name} hint={`${b.runs} (${b.balls})${b.isOnStrike ? " · on strike" : ""}`} />
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">How?</h3>
          <Option on={!out} onClick={() => setOut(false)} title="Retired hurt" hint="Not out. He can come back when a wicket falls." />
          <Option on={out} onClick={() => setOut(true)} title="Retired out" hint="Counts as a wicket (not the bowler's). He cannot come back." />
        </div>
      </div>
    </Modal>
  );
}
