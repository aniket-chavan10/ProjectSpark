import React from "react";

const UpcomingTournaments = ({ tournaments }) => {
  return (
    <div>
      {tournaments.length > 0 ? (
        <ul>
          {tournaments.map((tournament) => (
            <li key={tournament.id} className="mb-2 border-b pb-2 text-gray-700">
              <span className="font-medium">{tournament.village_name}</span> - {tournament.date}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600">No upcoming tournaments</p>
      )}
    </div>
  );
};

export default UpcomingTournaments;
