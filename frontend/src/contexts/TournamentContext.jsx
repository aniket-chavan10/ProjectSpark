import React, { useState } from 'react'; // Make sure React is imported

export const TournamentContext = React.createContext();

export const TournamentProvider = ({ children }) => {
  const [tournamentId, setTournamentId] = useState(null);

  return (
    <TournamentContext.Provider value={{ tournamentId, setTournamentId }}>
      {children}
    </TournamentContext.Provider>
  );
};
