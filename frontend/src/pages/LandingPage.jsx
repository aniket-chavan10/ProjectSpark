import React from "react";
import Navbar from "../components/Navbar";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { motion } from "framer-motion";
import LiveScores from "../components/LandingPage/LiveScores";

const LandingPage = () => {
  const carouselImages = [
    "https://picsum.photos/1920/600?random=1",
    "https://picsum.photos/1920/600?random=2",
    "https://picsum.photos/1920/600?random=3",
  ];

  const currentTournament = {
    name: "Winter Championship 2025",
    link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  };

  const pastMatches = [
    { name: "Match 1: Team A vs Team B", link: "https://www.youtube.com/watch?v=link1" },
    { name: "Match 2: Team C vs Team D", link: "https://www.youtube.com/watch?v=link2" },
    { name: "Match 3: Team E vs Team F", link: "https://www.youtube.com/watch?v=link3" },
  ];

  const pastWinners = [
    { name: "Team A", image: "https://picsum.photos/200?random=4" },
    { name: "Team B", image: "https://picsum.photos/200?random=5" },
    { name: "Team C", image: "https://picsum.photos/200?random=6" },
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    fade: true,
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />

      {/* Live Score Section */}
      <LiveScores/>

      {/* Hero Carousel */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
        <Slider {...settings}>
          {carouselImages.map((image, index) => (
            <div key={index}>
              <div
                className="relative h-[600px] bg-cover bg-center"
                style={{ backgroundImage: `url(${image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                <div className="relative flex h-full items-center justify-center">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center"
                  >
                    <div className="rounded-xl bg-white/10 p-8 backdrop-blur-sm">
                      <h2 className="text-5xl font-bold text-white drop-shadow-2xl">
                        Explore Cricket Like Never Before
                      </h2>
                      <p className="mb-8 mt-4 text-xl text-white/90">
                        Your one-stop solution for cricket management
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="rounded-lg bg-orange-600 px-10 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-orange-700"
                      >
                        Get Started
                      </motion.button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </motion.section>

      {/* Current Tournament */}
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="container mx-auto px-6 py-16"
      >
        <h3 className="mb-12 text-center text-4xl font-bold text-slate-800">Current Tournament</h3>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 p-8 shadow-2xl"
        >
          <div className="text-center">
            <h4 className="text-3xl font-bold text-white">{currentTournament.name}</h4>
            <motion.a
              whileHover={{ x: 5 }}
              href={currentTournament.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-lg text-white/90 hover:text-white"
            >
              <span>Watch Live on YouTube</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </motion.a>
          </div>
        </motion.div>
      </motion.section>

      {/* Featured Tournaments */}
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="container mx-auto px-6 py-16"
      >
        <h3 className="mb-12 text-center text-4xl font-bold text-slate-800">Featured Tournaments</h3>
        <div className="grid gap-8 md:grid-cols-3">
          {["Summer League 2025", "Champions Trophy", "City Cricket Cup"].map((tournament, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -10 }}
              className="overflow-hidden rounded-xl bg-white shadow-lg transition-all hover:shadow-2xl"
            >
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
                <h4 className="text-xl font-bold text-white">{tournament}</h4>
              </div>
              <div className="p-6">
                <p className="text-gray-600">Starts: {new Date(2025, index + 5, 15).toDateString()}</p>
                <motion.button
                  whileHover={{ x: 5 }}
                  className="mt-4 flex items-center gap-2 text-orange-600 hover:text-orange-700"
                >
                  <span>View Details</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Past Matches */}
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="container mx-auto px-6 py-16"
      >
        <h3 className="mb-12 text-center text-4xl font-bold text-slate-800">Past Matches</h3>
        <div className="grid gap-6 md:grid-cols-3">
          {pastMatches.map((match, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              className="rounded-xl bg-white p-6 shadow-lg"
            >
              <h4 className="text-lg font-bold text-slate-800">{match.name}</h4>
              <motion.a
                whileHover={{ x: 5 }}
                href={match.link}
                className="mt-4 inline-flex items-center gap-2 text-orange-600 hover:text-orange-700"
              >
                <span>Watch Replay</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                </svg>
              </motion.a>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Past Winners */}
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="container mx-auto px-6 py-16"
      >
        <h3 className="mb-12 text-center text-4xl font-bold text-slate-800">Past Winners</h3>
        <div className="grid gap-8 md:grid-cols-3">
          {pastWinners.map((winner, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className="rounded-xl bg-white p-6 text-center shadow-lg"
            >
              <div className="relative mx-auto mb-4 h-40 w-40">
                <img
                  src={winner.image}
                  alt={winner.name}
                  className="h-full w-full rounded-full object-cover shadow-md"
                />
                <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-orange-500 p-2 text-white">
                  202{index}
                </div>
              </div>
              <h4 className="text-xl font-bold text-slate-800">{winner.name}</h4>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Top Performers */}
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="bg-gradient-to-br from-slate-100 to-slate-200 py-16"
      >
        <div className="container mx-auto px-6">
          <h3 className="mb-12 text-center text-4xl font-bold text-slate-800">Top Performers</h3>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: "Top Scorer", name: "John Doe - 345 Runs", icon: "🏏" },
              { title: "Best Bowler", name: "Jane Smith - 15 Wickets", icon: "🎯" },
              { title: "MVP", name: "Chris Lee", icon: "⭐" },
            ].map((performer, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                className="rounded-xl bg-white p-8 text-center shadow-lg"
              >
                <div className="mb-4 text-4xl">{performer.icon}</div>
                <h4 className="text-xl font-bold text-slate-800">{performer.title}</h4>
                <p className="mt-2 text-orange-600">{performer.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 py-12 text-white">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xl font-semibold">&copy; 2025 Cricket Management</p>
          <div className="mt-6 flex justify-center gap-6">
            <motion.a
              whileHover={{ y: -2 }}
              href="#"
              className="hover:text-orange-500"
            >
              Privacy Policy
            </motion.a>
            <motion.a
              whileHover={{ y: -2 }}
              href="#"
              className="hover:text-orange-500"
            >
              Terms of Service
            </motion.a>
          </div>
          <div className="mt-6 flex justify-center gap-4">
            {["🐦", "📘", "📸"].map((icon, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-2xl"
              >
                {icon}
              </motion.button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;