import { Link } from "react-router-dom";
import { Td, Th, TableWrap } from "./ui";

// The scorecard of a finished match: batting with how each was out, bowling, extras, fall of wickets.
export default function Scorecard({ innings }) {
  if (!innings || !innings.length) return <p className="text-sm text-slate-500">No scorecard.</p>;
  return (
    <div className="space-y-8">
      {innings.map((inn) => (
        <section key={inn.inningId} aria-label={`${inn.teamName} innings`}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">{inn.teamName}</h3>
            <span className="text-lg font-extrabold tabular-nums text-slate-900">
              {inn.runs}/{inn.wickets} <span className="text-sm font-medium text-slate-500">({inn.overs} ov)</span>
            </span>
          </div>

          <TableWrap>
            <thead className="bg-slate-50">
              <tr>
                <Th>Batter</Th>
                <Th>How out</Th>
                <Th right>R</Th>
                <Th right>B</Th>
                <Th right>4s</Th>
                <Th right>6s</Th>
                <Th right>SR</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inn.batting.map((b) => (
                <tr key={b.playerId}>
                  <Td bold>
                    <Link to={`/players/${b.playerId}`} className="hover:text-emerald-700 hover:underline">
                      {b.name}
                    </Link>
                  </Td>
                  <Td className="text-slate-500">{b.howOut}</Td>
                  <Td right bold>{b.runs}</Td>
                  <Td right>{b.balls}</Td>
                  <Td right>{b.fours}</Td>
                  <Td right>{b.sixes}</Td>
                  <Td right>{b.strikeRate}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-semibold">Extras:</span> {inn.extras.total} (wd {inn.extras.wides}, nb {inn.extras.noBalls}, b {inn.extras.byes}, lb {inn.extras.legByes})
          </p>
          {inn.didNotBat && inn.didNotBat.length > 0 && (
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-semibold">Did not bat:</span> {inn.didNotBat.map((p) => p.name).join(", ")}
            </p>
          )}

          <div className="mt-4">
            <TableWrap>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Bowler</Th>
                  <Th right>O</Th>
                  <Th right>M</Th>
                  <Th right>R</Th>
                  <Th right>W</Th>
                  <Th right>Econ</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inn.bowling.map((b) => (
                  <tr key={b.playerId}>
                    <Td bold>
                      <Link to={`/players/${b.playerId}`} className="hover:text-emerald-700 hover:underline">
                        {b.name}
                      </Link>
                    </Td>
                    <Td right>{b.overs}</Td>
                    <Td right>{b.maidens}</Td>
                    <Td right>{b.runs}</Td>
                    <Td right bold>{b.wickets}</Td>
                    <Td right>{b.economy}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>

          {inn.fallOfWickets && inn.fallOfWickets.length > 0 && (
            <p className="mt-3 text-sm text-slate-600">
              <span className="font-semibold">Fall of wickets:</span> {inn.fallOfWickets.map((f) => `${f.wicketNumber}-${f.score} (${f.playerName}, ${f.over} ov)`).join(", ")}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
