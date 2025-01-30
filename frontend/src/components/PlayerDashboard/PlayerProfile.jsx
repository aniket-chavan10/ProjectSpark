// PlayerProfile.js
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import ReactDOM from "react-dom";

const PlayerProfile = ({ player, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-[#0C1C4A] rounded-xl shadow-2xl max-w-2xl w-full p-6 relative text-white"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-2xl text-[#F88D1B] hover:text-white"
          >
            &times;
          </button>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3">
              <img
                src={player.picture}
                alt={player.firstName}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>

            <div className="w-full md:w-2/3 space-y-4">
              <h2 className="text-3xl font-bold text-[#F88D1B]">
                {player.firstName} {player.lastName}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-300">Role</p>
                  <p className="text-lg">{player.role}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-300">Country</p>
                  <div className="flex items-center gap-2">
                    <img
                      src={player.countryFlag}
                      alt="Flag"
                      className="w-6 h-6 rounded-full"
                    />
                    <span>{player.country}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1E2B4E] p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-[#F88D1B]">Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  {player.stats.map((stat, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-300">{stat.title}</span>
                      <span className="font-bold">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {player.bio && (
                <div>
                  <h3 className="text-xl font-bold mb-2 text-[#F88D1B]">Bio</h3>
                  <p className="text-gray-300 leading-relaxed">{player.bio}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default PlayerProfile;