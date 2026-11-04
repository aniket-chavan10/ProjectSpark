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
};

/** A bar with only what the operator sent filled in over the defaults. */
export const withDefaults = (bar) => ({ ...BAR_DEFAULTS, ...(bar || {}) });

/** The two presets on the operator's desk. */
export const BAR_PRESETS = {
  full: { ...BAR_DEFAULTS },
  minimal: { ...BAR_DEFAULTS, batters: "none", bowler: false, thisOver: false, info: false, photos: false },
};
