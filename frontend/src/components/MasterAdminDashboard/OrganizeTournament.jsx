import React, { useState, useEffect } from 'react';
import teamApi from '../../api/teamApi'; // Import the API helper
import tournamentApi from '../../api/tournamentApi'; // Import the tournament API helper

const OrganizeTournament = () => {
  const [teams, setTeams] = useState([]); // Initialize teams as an empty array
  const [loading, setLoading] = useState(true); // Track loading state
  const [error, setError] = useState(null); // Track any errors

  // New states for start and end date
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(''); // Track the selected team

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await teamApi.getAllTeams(); // Fetch teams using axios
        setTeams(data); // Set the fetched teams
      } catch (error) {
        setError('Failed to load teams'); // Handle API errors
      } finally {
        setLoading(false); // Set loading to false after fetching
      }
    };

    fetchTeams();
  }, []); // Empty dependency array means this effect runs once on mount

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form submission

    // Debugging logs to check the current values of the fields
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Selected Team:', selectedTeam);

    if (!startDate || !endDate || !selectedTeam) {
      setError('All fields are required');
      return;
    }

    try {
      const tournamentData = {
        start_date: startDate,
        end_date: endDate,
        organizing_team: selectedTeam,
      };

      const response = await tournamentApi.addTournament(tournamentData); // Send data to the API to add the tournament
      alert('Tournament created successfully!');
      console.log('Tournament response:', response);
    } catch (err) {
      setError('Failed to create tournament');
      console.error('Error creating tournament:', err);
    }
  };

  // Handle loading and error states
  if (loading) {
    return <p className="text-center text-lg text-gray-600">Loading teams...</p>;
  }

  if (error) {
    return <p className="text-center text-lg text-red-600">{error}</p>;
  }

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Organize Tournament</h2>
      <form onSubmit={handleSubmit}>
        {/* Team Selection */}
        <div className="mb-4">
          <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-2">
            Select Team
          </label>
          <select
            id="team"
            name="team"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)} // Update selected team
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            {teams.length > 0 ? (
              teams.map((team) => (
                <option key={team.id} value={team.team_name}>
                  {team.team_name}
                </option>
              ))
            ) : (
              <option>No teams available</option>
            )}
          </select>
        </div>

        {/* Start Date Selection */}
        <div className="mb-4">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
            Tournament Start Date
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* End Date Selection */}
        <div className="mb-6">
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
            Tournament End Date
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 text-white py-2 px-6 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none"
          >
            Create Tournament
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrganizeTournament;
