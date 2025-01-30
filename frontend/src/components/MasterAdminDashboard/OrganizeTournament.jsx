import React, { useState, useEffect } from 'react';
import teamApi from '../../api/teamApi';
import tournamentApi from '../../api/tournamentApi';

const OrganizeTournament = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await teamApi.getAllTeams();
        setTeams(data);
      } catch (error) {
        setError('Failed to load teams');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

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

      const response = await tournamentApi.addTournament(tournamentData);
      alert('Tournament created successfully!');
    } catch (err) {
      setError('Failed to create tournament');
    }
  };

  if (loading) {
    return <p className="text-center text-lg text-gray-600">Loading teams...</p>;
  }

  if (error) {
    return <p className="text-center text-lg text-red-600">{error}</p>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Organize Tournament</h1>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Create Tournament</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team Selection */}
          <div>
            <label htmlFor="team" className="block text-sm font-medium text-gray-700">
              Select Team <span className="text-red-500">*</span>
            </label>
            <select
              id="team"
              name="team"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
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

          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Tournament Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              required
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              Tournament End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            Create Tournament
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrganizeTournament;
