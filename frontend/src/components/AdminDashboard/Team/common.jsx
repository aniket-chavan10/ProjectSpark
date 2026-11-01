// Small pieces shared by the team admin screens (players and squads). They are thin wrappers over the Spark UI kit,
// so these screens look exactly like the rest of the product.
import React from "react";
import { LuCalendarDays, LuSearch, LuShirt, LuTrophy } from "react-icons/lu";
import { Alert, Badge, Dialog, EmptyState, PlayerAvatar, Spinner as KitSpinner } from "../../ui/kit";

export const Avatar = ({ name, photo, size = 40, id }) => <PlayerAvatar name={name} photo={photo} size={size} id={id} />;

export const Banner = ({ tone = "info", children, onClose }) => (
  <Alert tone={tone} onClose={onClose}>
    {children}
  </Alert>
);

export const Spinner = ({ label = "Loading…" }) => <KitSpinner label={label} />;

const PILL = { slate: "slate", green: "green", amber: "amber", red: "red", blue: "blue" };
export const Pill = ({ tone = "slate", children }) => <Badge tone={PILL[tone] || "slate"}>{children}</Badge>;

const ICONS = { "🔍": LuSearch, "📅": LuCalendarDays, "🏆": LuTrophy };
export const Empty = ({ icon, title, children }) => <EmptyState icon={typeof icon === "function" ? icon : ICONS[icon] || LuShirt} title={title}>{children}</EmptyState>;

/** A bottom sheet on a phone, a centred dialog on a bigger screen. */
export const Sheet = ({ title, onClose, children }) => (
  <Dialog title={title} onClose={onClose} width="max-w-md">
    {children}
  </Dialog>
);
