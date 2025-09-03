import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PlayerCard from "./PlayerCard";
import adminApi from "../../api/adminApi"; // Import the API function

const ViewPlayers = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [players, setPlayers] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const fetchedPlayers = await adminApi.getPlayersByTeam();
        console.log("Fetched Players:", fetchedPlayers); // Debugging

        const formattedPlayers = fetchedPlayers.map((player) => ({
          player_id: player.player_id,
          picture: player.profile_picture, // Use directly since axiosInstance handles the base URL
          firstName: player.full_name?.split(" ")[0] || "",
          lastName: player.full_name?.split(" ")[1] || "",
          role: player.role || "Batter", // Use API role if available
          country: player.country || "India", // Use API country if available
          countryFlag: "https://flagcdn.com/w320/in.png",
          stats: [
            { title: "Matches", value: player.matches || "0" },
            { title: "Runs", value: player.runs || "0" },
            { title: "Highest Score", value: player.highest_score || "0" },
          ],
          profileLink: "#",
          bio: `Plays for ${player.team_name}`,
        }));

        setPlayers(formattedPlayers);
      } catch (error) {
        console.error("Error fetching players:", error);
      }
    };

    fetchPlayers();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollPosition(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex flex-col">
      <div className="bg-white py-3 z-10">
        <div className="flex justify-center space-x-5">
          {["All"].map((filter) => (
            <motion.button
              key={filter}
              type="button"
              className={`relative overflow-hidden font-semibold rounded-full text-sm px-6 py-2.5 transition-all duration-300 ${
                activeFilter === filter
                  ? "text-white bg-gradient-to-r from-[#0C1C4A] to-[#1E3A8A] shadow-lg"
                  : "text-[#0C1C4A] bg-gray-100 hover:bg-gray-200"
              }`}
              whileHover={{ 
                scale: activeFilter !== filter ? 1.05 : 1,
                boxShadow: activeFilter !== filter ? "0 4px 12px rgba(12, 28, 74, 0.1)" : "none"
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {players.map((player, index) => (
          <div key={index} className="bg-white rounded-lg shadow-xl overflow-hidden p-4 transition-transform duration-300 ease-in-out hover:scale-105">
            <PlayerCard player={player} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewPlayers;
