import React, { useEffect, useState } from "react";
import { LuMonitor } from "react-icons/lu";
import { btn, card } from "./classes";

const QUERY = "(min-width: 1024px)";

const useIsDesktop = () => {
  const [desktop, setDesktop] = useState(() => (typeof window === "undefined" ? true : window.matchMedia(QUERY).matches));
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return desktop;
};

/**
 * Some work needs a big screen (scheduling a tournament, scoring). On a phone or small tablet the page
 * says so and points to what can be done there, instead of showing a screen that cannot be used.
 */
const DesktopOnly = ({ title = "This needs a bigger screen", what = "This", alt, children }) => {
  const desktop = useIsDesktop();
  if (desktop) return children;
  return (
    <div className={`${card} mx-auto mt-6 max-w-md p-6 text-center`}>
      <LuMonitor className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">
        {what} is done from a laptop or desktop computer. Open Spark there to continue. On your phone you can still manage your players and your squads.
      </p>
      {alt && (
        <button type="button" className={`${btn.primary} mt-5 w-full`} onClick={alt.onClick}>
          {alt.label}
        </button>
      )}
    </div>
  );
};

export default DesktopOnly;
