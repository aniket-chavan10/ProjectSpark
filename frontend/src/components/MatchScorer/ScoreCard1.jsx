import React from 'react';

const CricketScorecard = () => {
  return (
    <div className="flex items-center bg-gray-900 text-white p-2">
      {/* Team 1 */}
      <div className="flex items-center space-x-2">
        <img src="/india-flag.png" alt="India" className="w-6 h-6" />
        <div className="text-lg font-bold">IND</div>
      </div>

      {/* Score */}
      <div className="flex items-center space-x-2 ml-4">
        <div className="text-xl font-bold">216</div>
        <div>-</div>
        <div className="text-lg">7</div>
      </div>

      {/* Over */}
      <div className="flex items-center space-x-2 ml-4">
        <div className="text-lg">48.</div>
        <div className="text-sm">3</div>
      </div>

      {/* Team 2 */}
      <div className="flex items-center space-x-2 ml-auto">
        <img src="/nz-flag.png" alt="New Zealand" className="w-6 h-6" />
        <div className="text-lg font-bold">NZ</div>
      </div>

      {/* Score */}
      <div className="flex items-center space-x-2 ml-4">
        <div className="text-xl font-bold">0</div>
        <div>-</div>
        <div className="text-lg">0</div>
      </div>

      {/* Over */}
      <div className="flex items-center space-x-2 ml-4">
        <div className="text-lg">0.</div>
        <div className="text-sm">0</div>
      </div>
    </div>
  );
};

export default CricketScorecard;