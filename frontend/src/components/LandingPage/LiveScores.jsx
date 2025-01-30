import { motion } from 'framer-motion';

const LiveScores = () => {
  // Single live match data
  const liveMatch = {
    teamA: { 
      name: 'IND', 
      score: '189/4', 
      overs: '18.2', 
      logo: '🇮🇳',
      batsmen: [
        { name: 'V Kohli', runs: '72* (41)' },
        { name: 'R Sharma', runs: '45 (30)' }
      ]
    },
    teamB: { 
      name: 'AUS', 
      score: '205/6', 
      overs: '20.0', 
      logo: '🇦🇺',
      bowlers: [
        { name: 'P Cummins', figures: '3-0-32-2' },
        { name: 'M Starc', figures: '3.2-0-28-1' }
      ]
    },
    current: {
      required: '17 runs from 10 balls',
      crr: '9.80',
      rrr: '10.20',
      partnership: '84 (52)',
      lastFiveOvers: [1, 4, 6, 2, 1] // Runs per ball
    },
    status: 'LIVE'
  };

  return (
    <div className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <motion.div 
          whileHover={{ height: 160 }}
          className="relative overflow-hidden"
          style={{ height: 60 }}
        >
          {/* Main Score Bar */}
          <div className="flex items-center justify-between h-[60px]">
            {/* Team A */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">{liveMatch.teamA.logo}</span>
              <div>
                <h3 className="text-lg font-bold">{liveMatch.teamA.name}</h3>
                <p className="text-sm text-gray-600">
                  {liveMatch.teamA.score} ({liveMatch.teamA.overs})
                </p>
              </div>
            </div>

            {/* Match Status */}
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${
                liveMatch.status === 'LIVE' ? 'animate-pulse bg-red-500' : 'bg-gray-400'
              }`}></span>
              <span className="text-sm font-semibold text-red-600">
                {liveMatch.status}
              </span>
            </div>

            {/* Team B */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <h3 className="text-lg font-bold">{liveMatch.teamB.name}</h3>
                <p className="text-sm text-gray-600">
                  {liveMatch.teamB.score} ({liveMatch.teamB.overs})
                </p>
              </div>
              <span className="text-2xl">{liveMatch.teamB.logo}</span>
            </div>
          </div>

          {/* Expanded Details */}
          <div className="absolute top-[60px] left-0 right-0 bg-white p-4 border-t">
            <div className="grid grid-cols-3 gap-4">
              {/* Required Runs */}
              <div className="text-center">
                <p className="text-sm text-gray-600">Required</p>
                <p className="font-semibold text-green-600">
                  {liveMatch.current.required}
                </p>
              </div>

              {/* CRR/RRR */}
              <div className="text-center">
                <p className="text-sm text-gray-600">CRR/RRR</p>
                <p className="font-semibold">
                  {liveMatch.current.crr} / {liveMatch.current.rrr}
                </p>
              </div>

              {/* Partnership */}
              <div className="text-center">
                <p className="text-sm text-gray-600">Partnership</p>
                <p className="font-semibold">
                  {liveMatch.current.partnership}
                </p>
              </div>
            </div>

            {/* Recent Balls */}
            <div className="mt-4">
              <div className="flex justify-center gap-2">
                {liveMatch.current.lastFiveOvers.map((runs, index) => (
                  <div 
                    key={index}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    bg-blue-100 text-blue-800"
                  >
                    {runs}
                  </div>
                ))}
              </div>
            </div>

            {/* Batting/Bowling */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-1">Batting</h4>
                {liveMatch.teamA.batsmen.map((batsman, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{batsman.name}</span>
                    <span className="font-medium">{batsman.runs}</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-semibold mb-1">Bowling</h4>
                {liveMatch.teamB.bowlers.map((bowler, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{bowler.name}</span>
                    <span className="font-medium">{bowler.figures}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LiveScores;