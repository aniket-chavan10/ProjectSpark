// My Squad: for each tournament the team is in, the team admin names the playing XI + reserves, and can change
// the XI for a single match until its toss. Works on a phone.
import { LuTrophy } from "react-icons/lu";
import React, { useCallback, useEffect, useState } from "react";
import teamAdminApi from "../../../api/teamAdminApi";
import { btn, card, stageName, stageStyle } from "../../ui/classes";
import { Banner, Empty, Pill, Spinner } from "./common";
import SquadEditor from "./SquadEditor";

const when = (m) => [m.date && new Date(`${m.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }), m.time].filter(Boolean).join(" · ");

const sourceTag = (m) =>
  m.locked ? <Pill tone="slate">Locked</Pill> : m.squadSource === "match" ? <Pill tone="blue">Changed for this match</Pill> : m.squadSource === "tournament" ? <Pill tone="green">Tournament squad</Pill> : <Pill tone="amber">No squad yet</Pill>;

/** Loads a squad payload and keeps it; `version` makes the editor start afresh after a reset. */
const useSquad = (load) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(async () => {
    setData(null);
    setError("");
    try {
      setData(await load());
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    }
  }, [load]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  // a save keeps the editor as it is (it already shows what was saved); a reset starts it afresh
  const accept = (next, { restart = false } = {}) => {
    setData(next);
    if (restart) setVersion((v) => v + 1);
    return next;
  };
  return { data, error, version, accept };
};

const TournamentSquad = ({ tournamentId, onSaved }) => {
  const load = useCallback(() => teamAdminApi.getTournamentSquad(tournamentId), [tournamentId]);
  const { data, error, version, accept } = useSquad(load);
  if (error) return <Banner tone="error">{error}</Banner>;
  if (!data) return <Spinner />;
  return (
    <SquadEditor
      key={version}
      data={data}
      saveLabel="Save tournament squad"
      onSave={async (input) => {
        accept(await teamAdminApi.saveTournamentSquad(tournamentId, input));
        onSaved && onSaved();
      }}
    />
  );
};

const MatchSquad = ({ fixtureId, onSaved }) => {
  const load = useCallback(() => teamAdminApi.getMatchSquad(fixtureId), [fixtureId]);
  const { data, error, version, accept } = useSquad(load);
  if (error) return <Banner tone="error">{error}</Banner>;
  if (!data) return <Spinner />;
  return (
    <div className="space-y-4">
      {!data.locked && (
        <Banner tone={data.source === "match" ? "info" : data.source === "tournament" ? "success" : "warn"}>
          {data.source === "match" && "You changed the squad for this match only. Your tournament squad stays as it is."}
          {data.source === "tournament" && "This match uses your tournament squad. Change it below if you want a different XI for this match only."}
          {data.source === "none" && "You have not named a squad yet. Choose your XI here, or save a tournament squad that every match will use."}
        </Banner>
      )}
      <SquadEditor
        key={version}
        data={data}
        saveLabel="Save for this match"
        onSave={async (input) => {
          accept(await teamAdminApi.saveMatchSquad(fixtureId, input));
          onSaved && onSaved();
        }}
        onReset={async () => {
          accept(await teamAdminApi.resetMatchSquad(fixtureId), { restart: true });
          onSaved && onSaved();
        }}
      />
    </div>
  );
};

const Matches = ({ tournamentId, refreshKey, onOpen }) => {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setMatches(null);
    teamAdminApi
      .myMatches(tournamentId)
      .then((m) => live && setMatches(m))
      .catch((err) => live && (setError(err.message), setMatches([])));
    return () => {
      live = false;
    };
  }, [tournamentId, refreshKey]);

  if (matches === null) return <Spinner />;
  return (
    <div className="space-y-3">
      {error && <Banner tone="error">{error}</Banner>}
      {!error && matches.length === 0 && <Empty icon="📅" title="No matches for your team yet">When the host schedules the tournament your matches show up here.</Empty>}
      <ul className="space-y-2">
        {matches.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => onOpen(m)} className={`${card} flex w-full items-center gap-3 p-3 text-left transition hover:border-emerald-400`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Match {m.matchNo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stageStyle[m.stage] || stageStyle.group}`}>
                    {stageName[m.stage] || m.stage}{m.group ? ` ${m.group}` : ""}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-700">vs {m.opponent || "to be decided"}</p>
                <p className="text-xs text-slate-500">{when(m) || "Date to be decided"}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">{sourceTag(m)}<span className="text-xs font-semibold text-emerald-700">{m.locked ? "View" : "Choose XI ›"}</span></div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Tabs = ({ value, onChange }) => (
  <div className="grid grid-cols-2 rounded-lg bg-slate-200 p-1 text-sm font-semibold" role="tablist">
    {[["tournament", "Tournament squad"], ["matches", "My matches"]].map(([id, name]) => (
      <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)} className={`rounded-md px-3 py-2 transition ${value === id ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}>
        {name}
      </button>
    ))}
  </div>
);

const SquadScreen = ({ goToPlayers }) => {
  const [tournaments, setTournaments] = useState(null);
  const [error, setError] = useState("");
  const [tournamentId, setTournamentId] = useState(null);
  const [tab, setTab] = useState("tournament");
  const [match, setMatch] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTournaments = useCallback(async () => {
    try {
      const list = await teamAdminApi.myTournaments();
      setTournaments(list);
      setTournamentId((current) => current || (list.length === 1 ? list[0].id : null));
    } catch (err) {
      setError(err.message);
      setTournaments([]);
    }
  }, []);
  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const changed = () => {
    setRefreshKey((k) => k + 1);
    loadTournaments();
  };

  if (tournaments === null) return <Spinner />;
  const tournament = tournaments.find((t) => t.id === tournamentId);

  // one match's squad
  if (tournament && match) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <button type="button" className={btn.ghost} onClick={() => setMatch(null)}>‹ Back to my matches</button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Match {match.matchNo} · vs {match.opponent || "TBD"}</h1>
          <p className="text-sm text-slate-500">{when(match) || tournament.name}</p>
        </div>
        <MatchSquad fixtureId={match.id} onSaved={changed} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Squad</h1>
        <p className="text-sm text-slate-500">Playing XI (up to 11) and up to 4 reserves. You can change the XI for a match until its toss.</p>
      </div>

      {error && <Banner tone="error" onClose={() => setError("")}>{error}</Banner>}

      {tournaments.length === 0 && !error ? (
        <Empty icon="🏆" title="Your team is not in a tournament yet">Apply for a tournament from the Tournament menu. Then you can name your squad here.</Empty>
      ) : !tournament ? (
        <ul className="space-y-2">
          {tournaments.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => { setTournamentId(t.id); setTab("tournament"); }} className={`${card} flex w-full items-center justify-between gap-3 p-4 text-left hover:border-emerald-400`}>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{[t.startDate, t.endDate].filter(Boolean).map((d) => String(d).slice(0, 10)).join(" → ")}</p>
                </div>
                {t.squadSubmitted ? <Pill tone="green">XI ready · {t.playingCount}</Pill> : <Pill tone="amber">Squad not named</Pill>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 truncate font-semibold text-slate-800"><LuTrophy className="h-4 w-4 text-amber-600" aria-hidden="true" /> {tournament.name}</p>
            {tournaments.length > 1 && <button type="button" className={btn.ghost} onClick={() => setTournamentId(null)}>Change</button>}
          </div>
          <Tabs value={tab} onChange={setTab} />
          {tab === "tournament" ? (
            <TournamentSquad tournamentId={tournament.id} onSaved={changed} />
          ) : (
            <Matches tournamentId={tournament.id} refreshKey={refreshKey} onOpen={setMatch} />
          )}
          {goToPlayers && <p className="text-center text-xs text-slate-500">Missing someone? <button type="button" className="font-semibold text-emerald-700 underline" onClick={goToPlayers}>Add a player</button></p>}
        </>
      )}
    </div>
  );
};

export default SquadScreen;
