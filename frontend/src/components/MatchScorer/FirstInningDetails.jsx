import React, { useState, useEffect } from 'react';

const FirstInningDetails = () => {
  const [total, setTotal] = useState('52-0');
  const [over, setOver] = useState('3');
  const [extras, setExtras] = useState('0');

  useEffect(() => {
    const socket = new WebSocket('wss://your-websocket-url-here');

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setTotal(data.total || '52-0');
        setOver(data.over || '3');
        setExtras(data.extras || '0');
      } catch (error) {
        console.error('Error parsing WebSocket data:', error);
      }
    };

    socket.onmessage = handleMessage;

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="w-full p-4 border border-gray-300">
      <h2 className="text-2xl font-bold mb-4">1<sup>nd</sup> Innings Details</h2>
      <table className="border-collapse border border-gray-300 w-full">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-300 px-4 py-2 text-left">Total</th>
            <th className="border border-gray-300 px-4 py-2 text-right">Ovr.</th>
            <th className="border border-gray-300 px-4 py-2 text-right">Extras</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-gray-100">
            <td className="border border-gray-300 px-4 py-2 text-left">{total}</td>
            <td className="border border-gray-300 px-4 py-2 text-right">{over}</td>
            <td className="border border-gray-300 px-4 py-2 text-right">{extras}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default FirstInningDetails;