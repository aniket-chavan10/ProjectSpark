// What the always-on score bar shows. The operator switches the parts on and off; the server keeps the choice for the
// match (backend/services/overlayService.js has the same defaults) and the overlay page follows it live.
export const BAR_DEFAULTS = {
  visible: true, // the whole bar
  batters: "both", // both | striker | nonStriker | none
  bowler: true,
  thisOver: true, // the balls of the over
  info: true, // the block on the right: target / need, or run rate and projection
  photos: true, // player photos in the bar
  corner: true, // the tournament / LIVE tag in the top-left corner
  events: true, // the four / six / wicket / fifty animations
  eventStyle: "bar", // bar: inside the score bar itself | banner: a photo banner above it
  theme: "basic", // basic: the standard graphics | premium: the TV-style package
};

export const THEMES = [
  { value: "basic", label: "Basic" },
  { value: "premium", label: "Premium" },
];

/** A bar with only what the operator sent filled in over the defaults. */
export const withDefaults = (bar) => ({ ...BAR_DEFAULTS, ...(bar || {}) });

/** The theme in force: ?theme=premium in the page address wins (handy in OBS), else what the operator chose. */
export const pickTheme = (urlTheme, bar) => (urlTheme === "premium" || urlTheme === "basic" ? urlTheme : (bar && bar.theme) || "basic");

// The two presets on the operator's desk. They set which parts of the bar show, never the theme: choosing "Score only"
// must not switch the look of the whole broadcast.
const { theme: _theme, ...PART_DEFAULTS } = BAR_DEFAULTS; // eslint-disable-line no-unused-vars
export const BAR_PRESETS = {
  full: { ...PART_DEFAULTS },
  minimal: { ...PART_DEFAULTS, batters: "none", bowler: false, thisOver: false, info: false, photos: false },
};

/** Is the bar showing exactly this preset (the theme does not count)? */
export const isPreset = (bar, preset) => Object.keys(preset).every((k) => bar[k] === preset[k]);
