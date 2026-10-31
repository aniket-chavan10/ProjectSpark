import { Link } from "react-router-dom";
import { Empty, PlayerPhoto, TableWrap, TeamLogo, Td, Th } from "./ui";

export const CATEGORIES = [
  { id: "batting", name: "Batters" },
  { id: "bowling", name: "Bowlers" },
  { id: "allrounder", name: "All-rounders" },
  { id: "keeper", name: "Wicket-keepers" },
];

const rankCell = (rank) => (
  <Td bold className={rank <= 3 ? "text-amber-600" : ""}>
    {rank}
  </Td>
);

export const RATING_CATEGORIES = [
  { id: "overall", name: "Overall" },
  { id: "batting", name: "Batting" },
  { id: "bowling", name: "Bowling" },
  { id: "allrounder", name: "All-rounder" },
  { id: "fielding", name: "Fielding" },
];

/** ICC-style rating table: a number out of 1000 and recent form. */
export function RatingTable({ items, compact }) {
  if (!items || !items.length) return <Empty>No ratings yet. A player is rated after a couple of finished matches.</Empty>;
  return (
    <TableWrap>
      <thead className="bg-slate-50">
        <tr>
          <Th>#</Th>
          <Th>Player</Th>
          {!compact && <Th right>Matches</Th>}
          {!compact && <Th right>Form (last 5)</Th>}
          <Th right>Rating</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.map((p) => (
          <tr key={p.playerId} className="hover:bg-slate-50">
            {rankCell(p.rank)}
            <Td bold>
              <Link to={`/players/${p.playerId}`} className="flex items-center gap-3 hover:text-emerald-700">
                <PlayerPhoto player={{ name: p.name, photo: p.photo }} size={32} />
                <span className="min-w-0">
                  <span className="block truncate">{p.name}</span>
                  <span className="block truncate text-xs font-normal text-slate-500">{p.teamName || ""}</span>
                </span>
              </Link>
            </Td>
            {!compact && <Td right>{p.matches}</Td>}
            {!compact && <Td right>{p.form}</Td>}
            <Td right bold>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-800">{p.rating}</span>
            </Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

export function TeamRankingTable({ items, compact }) {
  if (!items || !items.length) return <Empty>No ranking yet. Points are given as tournament matches finish.</Empty>;
  return (
    <TableWrap>
      <thead className="bg-slate-50">
        <tr>
          <Th>#</Th>
          <Th>Team</Th>
          {!compact && <Th right>Played</Th>}
          {!compact && <Th right>Won</Th>}
          {!compact && <Th right>Titles</Th>}
          <Th right>Points</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.map((r) => (
          <tr key={r.teamId} className="hover:bg-slate-50">
            {rankCell(r.rank)}
            <Td bold>
              <Link to={`/teams/${r.teamId}`} className="flex items-center gap-3 hover:text-emerald-700">
                <TeamLogo team={{ id: r.teamId, name: r.name, logo: r.logo }} size={28} />
                <span className="truncate">{r.name}</span>
              </Link>
            </Td>
            {!compact && <Td right>{r.played}</Td>}
            {!compact && <Td right>{r.won}</Td>}
            {!compact && <Td right>{r.titles}</Td>}
            <Td right bold>
              {r.points}
            </Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

/** Columns per category, like a cricket ranking table. */
const COLUMNS = {
  batting: [
    ["Mat", (p) => p.matches],
    ["Runs", (p) => p.runs, true],
    ["Avg", (p) => p.average ?? "—"],
    ["SR", (p) => p.strikeRate ?? "—"],
    ["HS", (p) => p.highest],
    ["50/100", (p) => `${p.fifties}/${p.hundreds}`],
  ],
  bowling: [
    ["Mat", (p) => p.matches],
    ["Wkts", (p) => p.wickets, true],
    ["Overs", (p) => p.overs],
    ["Econ", (p) => p.economy ?? "—"],
    ["Best", (p) => p.bestWickets],
    ["Mdns", (p) => p.maidens],
  ],
  allrounder: [
    ["Mat", (p) => p.matches],
    ["Runs", (p) => p.runs],
    ["Wkts", (p) => p.wickets],
    ["Rating", (p) => p.rating, true],
  ],
  keeper: [
    ["Mat", (p) => p.keeperMatches],
    ["Dismissals", (p) => p.keeperDismissals, true],
    ["Catches", (p) => p.catches],
    ["Stumpings", (p) => p.stumpings],
    ["Runs", (p) => p.runs],
  ],
};

export function PlayerRankingTable({ category, items, compact }) {
  if (!items || !items.length) return <Empty>Nobody here yet. Figures appear after the first finished match.</Empty>;
  const cols = compact ? COLUMNS[category].filter((c) => c[2]) : COLUMNS[category];
  return (
    <TableWrap>
      <thead className="bg-slate-50">
        <tr>
          <Th>#</Th>
          <Th>Player</Th>
          {cols.map(([name]) => (
            <Th key={name} right>
              {name}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.map((p) => (
          <tr key={p.playerId} className="hover:bg-slate-50">
            {rankCell(p.rank)}
            <Td bold>
              <Link to={`/players/${p.playerId}`} className="flex items-center gap-3 hover:text-emerald-700">
                <PlayerPhoto player={{ name: p.name, photo: p.photo }} size={32} />
                <span className="min-w-0">
                  <span className="block truncate">{p.name}</span>
                  <span className="block truncate text-xs font-normal text-slate-500">{p.teamName || ""}</span>
                </span>
              </Link>
            </Td>
            {cols.map(([name, get, main]) => (
              <Td key={name} right bold={!!main}>
                {get(p)}
              </Td>
            ))}
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
