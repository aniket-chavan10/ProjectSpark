import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef } from "react";
import { useMotionValue, useMotionValueEvent } from "framer-motion";

// A master clock for the Premium effects that are choreographed like a TV graphic: one number, `s` (seconds since the
// graphic started), and every layer works out where it is at that moment (position, scale, blur, opacity ...) with
// its own easing. That is how broadcast templates are built, and it makes the effects exact, repeatable and scrubbable.

/**
 * Debug controls the test lab provides; on air there is no provider, so the defaults apply.
 *   speed  1 = real time, 0.25 = a quarter of the speed (to look at frames)
 *   scrub  null = play, or a number of seconds to freeze the graphic at
 */
export const PremiumDebug = createContext({ speed: 1, scrub: null });
export const useDebug = () => useContext(PremiumDebug);

/**
 * A MotionValue that counts seconds from mount up to `duration`, in real time (or slowed / frozen by the debug controls).
 * It stops by itself at `duration`.
 */
export function useClock(duration) {
  const { speed, scrub } = useDebug();
  const t = useMotionValue(scrub != null ? scrub : 0);
  useEffect(() => {
    if (scrub != null) {
      t.set(scrub);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const s = Math.min(duration, ((now - start) / 1000) * speed);
      t.set(s);
      if (s < duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [t, duration, speed, scrub]);
  return t;
}

/**
 * An element whose style is a function of the clock. `at(s)` returns the style properties that change over time
 * (transform, opacity, filter, clipPath ...); they are written straight to the element, so nothing re-renders.
 * Keep those properties out of `style`.
 */
export function Live({ t, at, style, children, ...rest }) {
  const ref = useRef(null);
  const apply = useCallback(
    (s) => {
      const el = ref.current;
      if (!el) return;
      const o = at(s);
      for (const k in o) el.style[k] = o[k];
    },
    [at]
  );
  useLayoutEffect(() => {
    apply(t.get());
  }, [apply, t]);
  useMotionValueEvent(t, "change", apply);
  return (
    <div ref={ref} style={style} {...rest}>
      {children}
    </div>
  );
}

/* --------------------------------------- easing --------------------------------------- */

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** Where `s` is between a and b, 0 to 1. */
export const seg = (s, a, b) => clamp01((s - a) / (b - a));
export const lerp = (a, b, x) => a + (b - a) * x;
export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);
export const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const easeInCubic = (x) => x * x * x;
export const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** Overshoots past 1 and settles back: a punchy arrival. */
export const easeOutBack = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
