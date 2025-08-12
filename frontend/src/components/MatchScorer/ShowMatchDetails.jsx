import React, { useState, useEffect } from 'react';

const ShowMatchDetails = () => {
  const [inputValue, setInputValue] = useState('5');
  const [messages, setMessages] = useState([
    { label: 'Toss', message: 'Toss details will be shown here' },
    { label: 'Venue', message: 'Venue information will appear here' },
    { label: 'Run Rate', message: 'Current run rate: 7.2 RPO' },
    { label: 'Show Text', message: 'Text commentary is available' },
    { label: 'Boundary', message: 'Boundary details shown here' },
    { label: 'Project Score', message: 'Projected score: 280' },
    { label: 'Req Run Rate', message: 'Required run rate: 9.5 RPO' },
    { label: 'Target', message: 'Target score: 271' },
    { label: 'Need Runs', message: 'Need 33 To Win From 111 Balls' },
    { label: 'This Over', message: 'Current over details here' },
    { label: 'Extras', message: 'Extras: 12 (wides: 5, byes: 7)' },
    { label: 'Win', message: 'Win probability: 65%' }
  ]);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(8); // Default to 'Need Runs'

  useEffect(() => {
    const socket = new WebSocket('wss://your-websocket-url-here');

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => prev.map(msg => ({
          ...msg,
          message: data[msg.label.toLowerCase()] || msg.message
        })));
      } catch (error) {
        console.error('WebSocket error:', error);
      }
    };

    socket.onmessage = handleMessage;

    return () => socket.close();
  }, []);

  return (
    <div className="w-full p-4 border border-gray-300 bg-gray-200">
      <div className="text-lg font-bold mb-4">Show Match Details Live</div>
      <div className="flex items-center space-x-4 mb-4">
        <input
          type="number"
          className="w-16 bg-white text-black p-2 rounded"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <div className="flex-1 text-center bg-white text-black p-2 rounded">
          {messages[selectedMessageIndex].message}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {messages.map((msg, i) => (
          <button 
            key={i} 
            className={`bg-${i === selectedMessageIndex ? 'blue-500' : 'white'} 
                      text-${i === selectedMessageIndex ? 'white' : 'gray-800'} 
                      px-4 py-2 rounded`}
            onClick={() => setSelectedMessageIndex(i)}
          >
            {msg.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ShowMatchDetails;