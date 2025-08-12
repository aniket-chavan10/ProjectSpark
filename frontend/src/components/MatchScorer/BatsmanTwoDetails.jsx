import React, { useState, useEffect } from 'react';

const BatsmanTwoDetails = () => {
  const [batsmanData, setBatsmanData] = useState({
    name: 'Player Name Here',
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    sr: 0.0,
    isPlaying: false
  });

  useEffect(() => {
    const socket = new WebSocket('wss://your-websocket-url-here');

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setBatsmanData({
          name: data.name || 'Player Name Here',
          runs: data.runs || 0,
          balls: data.balls || 0,
          fours: data.fours || 0,
          sixes: data.sixes || 0,
          sr: data.sr || 0.0,
          isPlaying: data.isPlaying !== false
        });
      } catch (error) {
        console.error('WebSocket error:', error);
      }
    };

    socket.onmessage = handleMessage;

    return () => socket.close();
  }, []);

  return (
    <div className="bg-red-800 border border-white p-4 text-white">
      <div className="text-2xl font-bold mb-4">Batsman 2 Details</div>
      <div className="flex items-center space-x-4">
        <div className="bg-red-800 border border-white w-10 h-10 flex items-center justify-center rounded">
          {batsmanData.isPlaying ? '✅' : ''}
        </div>
        <div className="text-2xl font-bold text-white">2</div>
        <div className="bg-white text-black px-2 py-1 rounded">{batsmanData.name}</div>
        <div className="flex space-x-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="bg-white text-red-800 w-16 h-16 flex flex-col items-center justify-center rounded">
              <div className="text-sm font-bold">
                {['R', 'B', '4s', '6s', 'SR'][index]}
              </div>
              <div className="text-lg">
                {index === 4 
                  ? batsmanData.sr.toFixed(1) 
                  : index === 3 
                    ? batsmanData.sixes 
                    : index === 2 
                      ? batsmanData.fours 
                      : index === 1 
                        ? batsmanData.balls 
                        : batsmanData.runs}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BatsmanTwoDetails;