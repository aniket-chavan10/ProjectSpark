import React from 'react';

const Stats = () => {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Stats</h1>
            <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-semibold">Player Statistics</h2>
                <ul className="mt-2 space-y-2">
                    <li>Matches Played: 25</li>
                    <li>Goals Scored: 18</li>
                    <li>Assists: 5</li>
                    <li>Yellow Cards: 2</li>
                    <li>Red Cards: 0</li>
                </ul>
            </div>
        </div>
    );
};

export default Stats;
