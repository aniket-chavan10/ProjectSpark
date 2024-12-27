import React, { useState } from 'react';

const Organizer = () => {
    const [isRequestAccepted, setIsRequestAccepted] = useState(null);

    const handleAccept = () => {
        setIsRequestAccepted(true);
    };

    const handleReject = () => {
        setIsRequestAccepted(false);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            {isRequestAccepted === null ? (
                <div>
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Request</h2>
                    <p className="text-gray-600 mb-4">Do you accept the request to manage tournaments?</p>
                    <button
                        onClick={handleAccept}
                        className="mr-4 px-4 py-2 bg-green-500 text-white rounded"
                    >
                        Accept
                    </button>
                    <button
                        onClick={handleReject}
                        className="px-4 py-2 bg-red-500 text-white rounded"
                    >
                        Reject
                    </button>
                </div>
            ) : isRequestAccepted ? (
                <div>
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Organizer</h2>
                    <p className="text-gray-600">Here you can manage your tournaments, schedule matches, etc.</p>
                </div>
            ) : (
                <div>
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Request Rejected</h2>
                    <p className="text-gray-600">You have rejected the request. No further actions available.</p>
                </div>
            )}
        </div>
    );
};

export default Organizer;
