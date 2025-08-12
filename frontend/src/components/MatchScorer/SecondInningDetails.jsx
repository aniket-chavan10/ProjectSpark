import React, { useState, useEffect } from 'react';

const SecondInningDetails = () => {
  const [total, setTotal] = useState('20-1');
  const [over, setOver] = useState('1.4');
  const [rrr, setRrr] = useState('1.80');
  const [nrr, setNrr] = useState('33');
  const [from, setFrom] = useState('110');
  const [extras, setExtras] = useState('0');

  useEffect(() => {
    const socket = new WebSocket('wss://your-websocket-url-here');

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setTotal(data.total || '20-1');
        setOver(data.over || '1.4');
        setRrr(data.rrr || '1.80');
        setNrr(data.nrr || '33');
        setFrom(data.from || '110');
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
      <h2 className="text-2xl font-bold mb-4">2<sup>nd</sup> Innings Details</h2>
      <table className="border-collapse border border-gray-300 w-full">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-300 px-4 py-2 text-left">Total</th>
            <th className="border border-gray-300 px-4 py-2 text-right">Ovr.</th>
            <th className="border border-gray-300 px-4 py-2 text-right">RRR</th>
            <th className="border border-gray-300 px-4 py-2 text-right">Need</th>
            <th className="border border-gray-300 px-4 py-2 text-right">From</th>
            <th className="border border-gray-300 px-4 py-2 text-right">Extras</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-gray-100">
            <td className="border border-gray-300 px-4 py-2 text-left">{total}</td>
            <td className="border border-gray-300 px-4 py-2 text-right">{over}</td>
            <td className="border border-gray-300 px-4 py-2 text-right">{rrr}</td>
            <td className="border border-gray-300 px-4 py-2 text-right">{nrr}</td>
            <td className="border border-gray-300 px-4 py-2 text-right">{from}</td>
            <td className="border border-gray-300 px-4 py-2 text-right">{extras}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SecondInningDetails;