import { useEffect, useState } from "react";
import { PlayerAvatar } from "../ui/kit";
import { ActionShell, CButton, Choice, Kbd, Label } from "./console";

/** A batter leaves between balls: retired hurt (may return) or retired out (a wicket). It is not a delivery. */
export default function RetirePanel({ batters, onSubmit, onClose, busy }) {
  const [id, setId] = useState(batters[0] && batters[0].playerId);
  const [out, setOut] = useState(false);
  const submit = () => id && !busy && onSubmit({ batsmanId: id, retiredOut: out });

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "Enter") submit();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <ActionShell
      tone="amber"
      title="Batter retires"
      subtitle="This is not a ball: nothing is added to the score or the over."
      onBack={onClose}
      footer={
        <div className="flex justify-end">
          <CButton variant="primary" size="lg" disabled={!id || busy} onClick={submit}>
            {busy ? "Saving…" : "Confirm"} <Kbd>Enter</Kbd>
          </CButton>
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <Label>Who retires?</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {batters.map((b) => (
              <Choice key={b.playerId} on={id === b.playerId} onClick={() => setId(b.playerId)} className="flex h-16 items-center gap-3 !px-3 text-left">
                <PlayerAvatar name={b.name} photo={b.profilePicture} id={b.playerId} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-[14px]">{b.name}</span>
                  <span className="block text-xs font-medium opacity-70">
                    {b.runs} ({b.balls}){b.isOnStrike ? " · on strike" : ""}
                  </span>
                </span>
              </Choice>
            ))}
          </div>
        </section>
        <section>
          <Label>How?</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice on={!out} onClick={() => setOut(false)} className="h-16 text-left">
              <span className="block text-[14px]">Retired hurt</span>
              <span className="block text-xs font-medium opacity-70">Not out. Can come back when a wicket falls.</span>
            </Choice>
            <Choice on={out} onClick={() => setOut(true)} className="h-16 text-left">
              <span className="block text-[14px]">Retired out</span>
              <span className="block text-xs font-medium opacity-70">Counts as a wicket. Cannot come back.</span>
            </Choice>
          </div>
        </section>
      </div>
    </ActionShell>
  );
}
