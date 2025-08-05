import React, { useState, useEffect, useContext } from "react";
import adminApi from "../../api/adminApi";
import MatchCard from "./MatchCard";
import { TournamentContext } from "../../contexts/TournamentContext";

const ShowMatchSequence = () => {
  const { tournamentId } = useContext(TournamentContext);
  const [matchesState, setMatchesState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("Tournament ID from context:", tournamentId);
    if (!tournamentId) return;

    const fetchMatches = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await adminApi.getScheduledMatches(tournamentId);
        const matchesMap = new Map();
        console.log("Response:", response);

        const matches = response.matches.map((match) => ({
          id: match.id, // Keep id internally if needed
          match_no: match.match_no,
          round: match.round_number,
          group: match.group_name || "Unassigned",
          team1: {
            name:
              match.team1_name ||
              (match.dependent_match1_id ? `Winner of Match ${match.dependent_match1_id}` : "TBD"),
            logo: "https://via.placeholder.com/50",
          },
          team2: {
            name:
              match.team2_name ||
              (match.dependent_match2_id ? `Winner of Match ${match.dependent_match2_id}` : "TBD"),
            logo: "https://via.placeholder.com/50",
          },
          date: new Date(match.match_date).toLocaleDateString(),
          time: new Date(match.match_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: match.status,
          winner: match.winner || "TBD",
          wonBy: match.won_by || "TBD",
          dependentMatch1Id: match.dependent_match1_id,
          dependentMatch2Id: match.dependent_match2_id,
        }));

        matches.forEach((match) => {
          if (match.dependentMatch1Id && matchesMap.has(match.dependentMatch1Id)) {
            match.team1.name = `Winner of Match ${match.dependentMatch1Id}`;
          }
          if (match.dependentMatch2Id && matchesMap.has(match.dependentMatch2Id)) {
            match.team2.name = `Winner of Match ${match.dependentMatch2Id}`;
          }
          matchesMap.set(match.match_no, match); // Use match_no as key in Map
        });

        setMatchesState(matches);
      } catch (err) {
        console.error("Error fetching matches:", err);
        setError("Failed to load matches. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [tournamentId]);

  if (loading) {
    return <div className="text-center">Loading matches...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Match Results and Upcoming Matches</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {matchesState.length > 0 ? (
          matchesState.map((match) => (
            <MatchCard
              key={match.match_no} // Use match_no as key
              match={match}
              onUpdate={(matchNo, date, time) =>
                setMatchesState((prevMatches) =>
                  prevMatches.map((m) => (m.match_no === matchNo ? { ...m, date, time } : m))
                )
              }
              onStart={(matchNo) => console.log(`Match ${matchNo} started!`)}
            />
          ))
        ) : (
          <div className="text-center text-gray-600">No matches found.</div>
        )}
      </div>
    </div>
  );
};

export default ShowMatchSequence;