import React from 'react';

const Leaderboards = () => {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Leaderboards</h1>
            <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-semibold">Top Players</h2>
                <ul className="mt-2 space-y-2">
                    <li>1. Player A - 100 Points</li>
                    <li>2. Player B - 90 Points</li>
                    <li>3. Player C - 85 Points</li>
                    <li>4. Player D - 80 Points</li>
                    <li>5. Player E - 75 Points</li>
                </ul>
            </div>
        </div>
    );
};

export default Leaderboards;
