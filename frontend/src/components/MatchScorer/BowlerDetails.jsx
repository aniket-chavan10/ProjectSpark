import React, { useState, useEffect } from 'react';

const BowlerDetails = () => {
  const [bowlers, setBowlers] = useState([
    {
      name: 'B Kumar',
      overs: '0.4',
      maidens: 0,
      runs: 8,
      wickets: 1,
      economy: 12.00,
      dots: 0,
      extras: 0
    }
  ]);

  useEffect(() => {
    const socket = new WebSocket('wss://your-websocket-url-here');

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const existingIndex = bowlers.findIndex(b => b.name === data.name);
        if (existingIndex !== -1) {
          const updatedBowlers = [...bowlers];
          updatedBowlers[existingIndex] = {
            ...updatedBowlers[existingIndex],
            ...data,
            economy: parseFloat(data.economy) || 0.0
          };
          setBowlers(updatedBowlers);
        } else {
          setBowlers(prev => [...prev, {
            ...data,
            economy: parseFloat(data.economy) || 0.0
          }]);
        }
      } catch (error) {
        console.error('WebSocket error:', error);
      }
    };

    socket.onmessage = handleMessage;

    return () => socket.close();
  }, []);

  return (
    <div className="w-full p-4 border border-gray-300">
      <h2 className="text-2xl font-bold mb-4">Bowler Details</h2>
      <table className="border-collapse border border-gray-300 w-full">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-300 px-4 py-2 text-left">Bowler</th>
            <th className="border border-gray-300 px-4 py-2 text-right">O</th>
            <th className="border border-gray-300 px-4 py-2 text-right">M</th>
            <th className="border border-gray-300 px-4 py-2 text-right">R</th>
            <th className="border border-gray-300 px-4 py-2 text-right">W</th>
            <th className="border border-gray-300 px-4 py-2 text-right">E</th>
            <th className="border border-gray-300 px-4 py-2 text-right">D</th>
            <th className="border border-gray-300 px-4 py-2 text-right">Ex</th>
          </tr>
        </thead>
        <tbody>
          {bowlers.map((bowler, index) => (
            <tr key={index} className="bg-gray-100">
              <td className="border border-gray-300 px-4 py-2 text-left">{bowler.name}</td>
              <td className="border border-gray-300 px-4 py-2 text-right">{bowler.overs}</td>
              <td className="border border-gray-300 px-4 py-2 text-right">{bowler.maidens}</td>
              <td className="border border-gray-300 px-4 py-2 text-right">{bowler.runs}</td>
              <td className="border border-gray-300 px-4 py-2 text-right">{bowler.wickets}</td>
              <td className="border border-gray-300 px-4 py-2 text-right">{bowler.economy.toFixed(2)}</td>
              <td className="border border-gray-300 px-4 py-2 text-right">{bowler.dots}</td>
              <td className="border border-gray-300 px-4 py-2 text-right">{bowler.extras}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BowlerDetails;