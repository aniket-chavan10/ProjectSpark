import React from "react";
import { LuArrowRight, LuUsersRound } from "react-icons/lu";
import { Badge, Button, Card, CardHeader, EmptyState, TeamLogo } from "../../ui/kit";

const STATUS = {
  confirmed: ["green", "Confirmed"],
  approved: ["green", "Approved"],
  payment_pending: ["amber", "Payment pending"],
  pending: ["amber", "Pending"],
  cancelled: ["red", "Cancelled"],
};

/** The group sizes a schedule can use: 2 or 4 groups, each with 2, 4, 8 or 16 teams. */
export const validLayouts = (teamCount) => {
  const out = [];
  for (const groups of [2, 4]) for (const size of [2, 4, 8, 16]) if (groups * size === teamCount) out.push({ groups, size });
  return out;
};

// Step 2: who has applied. The host sees every team with its status and moves on once the number works out.
export default function TeamsStep({ teams = [], totalSlots = 32, onContinue }) {
  const active = teams.filter((t) => t.status !== "cancelled");
  const layouts = validLayouts(active.length);

  return (
    <div className="space-y-5">
      <Card padded={false}>
        <div className="px-5 pt-5">
          <CardHeader
            icon={LuUsersRound}
            title={`${active.length} team${active.length === 1 ? "" : "s"} registered`}
            subtitle={`${Math.max(totalSlots - active.length, 0)} of ${totalSlots} places still open`}
            actions={
              <Button iconRight={LuArrowRight} disabled={active.length < 4} onClick={onContinue}>
                Continue to groups
              </Button>
            }
          />
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (active.length / totalSlots) * 100)}%` }} />
          </div>
        </div>

        {active.length >= 4 && !layouts.length && (
          <p className="mx-5 mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {active.length} teams cannot be split into 2 or 4 equal groups of 2, 4, 8 or 16. Plan for 4, 8, 16 or 32 teams: cancel or add teams to reach one of those.
          </p>
        )}
        {layouts.length > 0 && (
          <p className="mx-5 mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Possible layouts: {layouts.map((l) => `${l.groups} groups of ${l.size}`).join(" or ")}.
          </p>
        )}

        {active.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={LuUsersRound} title="No teams yet">
              Teams apply from their own dashboard. They show up here as soon as they do.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
            {teams.map((t, i) => {
              const [tone, text] = STATUS[t.status] || ["slate", t.status || "—"];
              return (
                <li key={t.team_id} className="flex items-center gap-4 px-5 py-3">
                  <span className="tabular w-6 text-sm font-semibold text-slate-400">{i + 1}</span>
                  <TeamLogo team={{ id: t.team_id, name: t.team_name, logo: t.logo }} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{t.team_name}</p>
                    {t.group_name && <p className="text-xs text-slate-500">Group {t.group_name}</p>}
                  </div>
                  <Badge tone={tone}>{text}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
