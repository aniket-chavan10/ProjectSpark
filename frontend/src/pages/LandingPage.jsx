import { useState } from 'react';

export default function InternationalScorecard() {
  const [matchData] = useState({
    teamA: {
      name: 'INDIA',
      code: 'IND',
      score: '289/4',
      overs: '42.3',
      batsmen: [
        { name: 'Rohit Sharma', runs: 78, balls: 65, fours: 8, sixes: 3, strike: true },
        { name: 'Virat Kohli', runs: 64, balls: 55, fours: 5, sixes: 1, strike: false }
      ],
      bowler: { name: 'Pat Cummins', overs: '8.2', wickets: 2, runs: 45 },
      partnership: '112 (72)'
    },
    teamB: {
      name: 'AUSTRALIA',
      code: 'AUS',
      score: '274/7',
      overs: '50.0'
    },
    series: 'ICC World Test Championship',
    venue: 'The Oval, London',
    currentRR: '6.84',
    requiredRR: '8.50',
    target: '290',
    recentBalls: ['6', '4', 'W', '1', '•', '2']
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-br from-slate-900 to-slate-800 border-t border-slate-700 shadow-2xl font-sans">
      {/* Series Header */}
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-3 text-slate-300">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            LIVE • {matchData.series}
          </span>
          <span className="text-slate-500">|</span>
          <span>{matchData.venue}</span>
        </div>
        <div className="text-slate-400">
          Day 3 • Session 2
        </div>
      </div>

      {/* Main Scoreboard */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Team A */}
          <div className="flex items-center gap-4 min-w-[200px]">
            <span className="text-3xl">🇮🇳</span>
            <div>
              <div className="text-lg font-bold text-slate-100">{matchData.teamA.code}</div>
              <div className="text-4xl font-bold text-white">{matchData.teamA.score}</div>
              <div className="text-sm text-slate-400">{matchData.teamA.overs} Overs</div>
            </div>
          </div>

          {/* Match Metrics */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-sm text-slate-400">Current RR</div>
                <div className="text-xl font-bold text-emerald-500">{matchData.currentRR}</div>
              </div>
              
              <div className="relative w-40 h-1.5 bg-slate-700 rounded-full">
                <div 
                  className="absolute h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                  style={{ width: '83%' }}
                ></div>
              </div>

              <div className="text-center">
                <div className="text-sm text-slate-400">Req. RR</div>
                <div className="text-xl font-bold text-rose-500">{matchData.requiredRR}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 text-sm">
              {matchData.recentBalls.map((ball, index) => (
                <div
                  key={index}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${ball === '6' ? 'bg-emerald-600 text-white' : 
                       ball === '4' ? 'bg-blue-600 text-white' : 
                       ball === 'W' ? 'bg-rose-600 text-white' : 
                       ball === '•' ? 'text-slate-500' : 'bg-slate-700 text-slate-300'}`}
                >
                  {ball}
                </div>
              ))}
            </div>
          </div>

          {/* Batsmen & Partnership */}
          <div className="flex-1 space-y-2 min-w-[300px]">
            <div className="flex items-center justify-between">
              {matchData.teamA.batsmen.map((batsman, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`text-sm ${batsman.strike ? 'text-white' : 'text-slate-400'}`}>
                    <span className="font-medium">{batsman.name.split(' ')[0]}</span>
                    <span className="ml-1 font-bold">{batsman.runs}</span>
                    <span className="text-xs text-slate-500 ml-1">({batsman.balls})</span>
                  </div>
                  {batsman.strike && <span className="text-xs text-cyan-400">✱</span>}
                </div>
              ))}
            </div>
            <div className="text-sm text-center text-slate-400">
              Partnership: {matchData.teamA.partnership} 
              <span className="mx-2">|</span>
              Last 5 Ov: 54/1
            </div>
          </div>

          {/* Bowler & Target */}
          <div className="flex items-center gap-6 min-w-[280px]">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-sm text-slate-400">Bowler</div>
                <div className="font-bold text-slate-100">{matchData.teamA.bowler.name}</div>
                <div className="text-sm text-slate-400">
                  {matchData.teamA.bowler.wickets}/{matchData.teamA.bowler.runs}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-700"></div>
            </div>

            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              <div className="text-sm text-slate-400">Target</div>
              <div className="text-2xl font-bold text-white">{matchData.target}</div>
              <div className="text-xs text-rose-400">Need 21 from 12</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}