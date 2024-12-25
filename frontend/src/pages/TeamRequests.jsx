// TeamRequests.jsx
import React from 'react';

const TeamRequests = ({ teamRequests, onAccept, onReject }) => {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Team Requests</h1>
            <div className="bg-white p-4 rounded-lg shadow">
                {teamRequests.length > 0 ? (
                    teamRequests.map((request) => (
                        <div key={request.id} className="mb-4">
                            <h2 className="text-lg font-bold">{request.teamName}</h2>
                            <p>Request Date: {request.requestDate}</p>
                            <button
                                onClick={() => onAccept(request.id)}
                                className="bg-green-500 text-white px-4 py-2 rounded mr-2"
                            >
                                Accept
                            </button>
                            <button
                                onClick={() => onReject(request.id)}
                                className="bg-gray-500 text-white px-4 py-2 rounded"
                            >
                                Reject
                            </button>
                        </div>
                    ))
                ) : (
                    <p>No team requests at the moment.</p>
                )}
            </div>
        </div>
    );
};

export default TeamRequests;
