// PlayerCard.js
import React, { useState } from "react";
import { motion } from "framer-motion";
import PlayerProfile from "../PlayerDashboard/PlayerProfile";
import image1 from "../../../../backend/uploads/patidar.png";

const PlayerCard = ({ player }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const dummyPlayer = {
    picture: image1,
    firstName: "Ashutosh",
    lastName: "Sharma",
    role: "Batter",
    country: "India",
    countryFlag: "https://flagcdn.com/w320/in.png",
    stats: [
      { title: "Matches", value: "11" },
      { title: "Runs", value: "189" },
      { title: "Highest Score", value: "61" },
    ],
    profileLink: "#",
    bio: "A rising star in Indian cricket known for explosive batting."
  };

  const currentPlayer = player || dummyPlayer;

  return (
    <div 
      className="relative w-72 sm:w-80 h-[400px] bg-[#0C1C4A] rounded-lg shadow-md overflow-hidden flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="flex-grow relative">
        <img
          src={currentPlayer.picture}
          alt={currentPlayer.firstName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Name Section */}
      <div className="h-[12%] flex items-center justify-center bg-black/50">
        <h2 className="text-xl font-bold text-[#F88D1B]">
          {currentPlayer.firstName} {currentPlayer.lastName}
        </h2>
      </div>

      {/* Slide-up Content */}
      <motion.div
        className="absolute bottom-0 left-0 w-full bg-[#0C1C4A] text-white px-3 py-4"
        animate={{ y: isHovered ? 0 : '100%' }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex justify-between items-center text-sm mb-3">
          <p>Role: {currentPlayer.role}</p>
          <div className="flex items-center">
            <img
              src={currentPlayer.countryFlag}
              alt="Flag"
              className="w-5 h-5 mr-1 rounded-full"
            />
            <p>{currentPlayer.country}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 text-center">
          {currentPlayer.stats.map((stat, index) => (
            <div key={index} className="p-2 bg-[#1E2B4E] rounded-lg">
              <p className="text-xs">{stat.title}</p>
              <p className="text-base font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-3">
          <motion.button
            onClick={() => setShowProfile(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-[#F88D1B] border border-[#F88D1B] rounded px-4 py-2 hover:bg-[#F88D1B] hover:text-white transition-colors"
          >
            View Profile
          </motion.button>
        </div>
      </motion.div>

      {/* Profile Modal */}
      {showProfile && (
        <PlayerProfile
          player={currentPlayer}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
};

export default PlayerCard;