import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PlayerCard from "./PlayerCard";
import teamLogo from "../../../../backend/uploads/kohli.png";

// Dummy data remains unchanged
const playerData = {
  picture: teamLogo,
  firstName: "Virat",
  lastName: "Kohli",
  role: "Batter",
  country: "India",
  countryFlag: "https://flagcdn.com/w320/in.png",
  stats: [
    { title: "Matches", value: "254" },
    { title: "Runs", value: "12000" },
    { title: "Highest Score", value: "183" },
  ],
  profileLink: "/players/68176-virat-kohli-profile",
};

const batterData = [
  { ...playerData, firstName: "Virat", lastName: "Kohli" },
  { ...playerData, firstName: "Rohit", lastName: "Sharma" },
];

const bowlerData = [
  {
    ...playerData,
    firstName: "Jasprit",
    lastName: "Bumrah",
    role: "Bowler",
    stats: [
      { title: "Matches", value: "50" },
      { title: "Wickets", value: "100" },
      { title: "Best Bowling", value: "5/15" },
    ],
    profileLink: "/players/68176-jasprit-bumrah-profile",
  },
  {
    ...playerData,
    firstName: "Mohammad",
    lastName: "Shami",
    role: "Bowler",
    stats: [
      { title: "Matches", value: "60" },
      { title: "Wickets", value: "150" },
      { title: "Best Bowling", value: "5/25" },
    ],
    profileLink: "/players/68176-mohammad-shami-profile",
  },
];

const ViewPlayers = () => {
  // Existing state and effects unchanged
  const [activeFilter, setActiveFilter] = useState("All");
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollPosition(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const logoScale = Math.min(1.5, 1 + scrollPosition / 1000);

  let displayedPlayers = [];
  if (activeFilter === "All") displayedPlayers = [...batterData, ...bowlerData];
  else if (activeFilter === "Batters") displayedPlayers = batterData;
  else displayedPlayers = bowlerData;

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex flex-col">
      {/* Updated Buttons Section */}
      <div className="bg-white py-3 z-10">
        <div className="flex justify-center space-x-5">
          {["All", "Batters", "Bowlers"].map((filter) => (
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
              {activeFilter === filter && (
                <motion.div
                  className="absolute inset-0 bg-white/10 rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Rest of the code remains exactly the same */}
      <div className="flex-1 overflow-y-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8" style={{ marginTop: "20px" }}>
        {displayedPlayers.map((player, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-xl overflow-hidden p-4 transition-transform duration-300 ease-in-out hover:scale-105"
          >
            <PlayerCard player={player} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewPlayers;