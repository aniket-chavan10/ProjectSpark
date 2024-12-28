import React, { useState } from 'react';

const Organizer = () => {
    const [isRequestAccepted, setIsRequestAccepted] = useState(null);
    const [bannerImage, setBannerImage] = useState(null);
    const [tournamentName, setTournamentName] = useState('');

    const handleAccept = () => {
        setIsRequestAccepted(true);
    };

    const handleReject = () => {
        setIsRequestAccepted(false);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        console.log("Banner Image:", bannerImage);
        console.log("Tournament Name:", tournamentName);
        alert("Tournament information submitted successfully!");
        // Reset form fields if needed
        setBannerImage(null);
        setTournamentName('');
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
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Congratulations!</h2>
                    <p className="text-gray-600 mb-4">Now you are the organizer for the next tournament.</p>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Banner Image:</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setBannerImage(e.target.files[0])}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tournament Name:</label>
                            <input
                                type="text"
                                value={tournamentName}
                                onChange={(e) => setTournamentName(e.target.value)}
                                placeholder="Enter Tournament Name"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Submit
                        </button>
                    </form>
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
